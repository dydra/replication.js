// Copyright (c) 2019 datagraph gmbh

/**
 @overview
The class GraphObject is an abstract class which wraps each
instance in a proxy to mediate property access and implement a jdo/jpa-like
state machine to control instance.
The logic distinguishes detached/attached situations wrt a ReplicaObjectStore
and, for attached objects, constrcts for them a delta map and uses that cache
upon tranaction completion to propagate changes to the respective remote
storage service.

The state graph is a reduced version of the JDO space which corresponds to
that model's 'persistent' states, and the 'transient' realm of that JDO space
does not figure in this implementation.

That is, the reduced space includes just
    new
    clean
    dirty
    deleted
with which the attachment/transaction status combines to yield the JDO
equivalents.

see:
    https://db.apache.org/jdo/state_transition.html,
    https://en.wikipedia.org/wiki/Java_Persistence_API
  
For specialized GraphObject classes :
  - writes to managed properties side-effect the state.
  - attached objects also generate delta maps during a transaction.
  - transactional reads from managed properties require a valid state.
*/

/**
 Encapsulate an error due to an invalid operation.
 @extends Error
 */
class GraphStateError extends Error {
  constructor(state, operation) {
    super(`Operation (${operation}) is ìnvalid in state (${state}).`);
    this.state = state;
    this.operation = operation;
  }
}

/**
 The abstract root class for all managed objects
 */
export class GraphObject {
  constructor () {
    var handler = this.initializeState(this.createHandler(this));
    this.initializeInstance(...arguments);
    return this.createProxy(this, handler);
  }


  /**
   Provide a method to initialize the handler meta-properies.
   from the constructor, it must be called with the hander
   for direct object creation, it defaults
   */
  initializeState(handler = this._handler, options = {state: GraphObject.stateNew}) {
    handler._deltas = null;
    handler._identifier = undefined;
    handler._state = options.state;
    handler._store = null;
    handler._self = this;
    handler._transaction = null;
    return (handler);
  }


  /**
   Provide a method to perform general initialization out-of-line.
   */
  initializeInstance(options) {}


  /**
   The final step of {@link GraphObject} base constructor invokes these to
   create the proxy which wraps the target instance and manages its property
   access. It excludes those which begin with '_' and limits control to
   {@link GraphObject#managedProperties}, if specified.
   {@link Object#set} is augmented to record modifcations and
   {@link Object#get} can be augmented perform property-specific retrieval.
   Set modifies instance state as a side-effect.
   As a special case, given get('_self'), it returns the target instance.
   */
  createProxy(target, handler) {
    return (new Proxy(target, handler));
  }

  createHandler (object) {
  var handler = {
    get(target, name) {
      // console.log("handled get", target, name)
      if (name == "_handler") { return (handler); }
      if (handler.hasOwnProperty(name)) { return (handler[name]); }
      return (target[name])
    },

    set(target, name, value) {
      console.log("handled set")
      if (name == "_handler") { throw new GraphStateError(true, "set"); }
      if (handler.hasOwnProperty(name)) { handler[name] = value; return true;}
      var properties = target.constructor.managedProperties();
      console.log("handled set", target, name, value, handler._store)
      if (properties.includes(name)) {
        // if the property is managed
        switch (handler._state) {
          case GraphObject.stateNew:
            break;
          case GraphObject.stateClean:
            handler._state = GraphObject.stateModified;
            break;
          case GraphObject.stateDeleted:
            throw new GraphStateError(handler._state, "set");
        }
        if (handler._store) {
          // attached
          console.log('persistent set');
          var oldValue = target[name];
          if (oldValue != value ) {
            var deltas = handler._deltas;
            if (! deltas) {
              deltas = {};
              handler._deltas = deltas;
            }
            var delta = deltas[name];
            if (delta) {
              if (delta[1] == value) {
                // if setting back to the original value, delete the entry
                deltas.delete(name);
              } else {
                // otherwise replace the new value
                delta[0] = value;
              }
            } else {
              // iff this is the first change, record [new,old]
              delta = [value, oldValue];
              deltas[name] = delta;
            }
          }
        } else {
          // detached
        }
      }
      // set the property
      target[name] = value;
      return true;
    },
  }
  return(handler);
  }


  /**
   The getter return a property which serves as the identity in the store.
   The value should be suitable to act as both an object and a map key.
   */
  getIdentifier () {
    return (this._identifier);
  }
  /**
   The setter must record a value suitable as the instance identity in the store.
   @abstract
   */
  setIdentifier (value) {
    this._identifier = value;
  }

  /**
   Return the object's store
   */
  store() {
    return (this._store);
  }

  /**
   Return the current instance state, ["clean", "deleted", "dirty", "new"],
   to reflect the correspondence between the instance state and that in the
   store.
   */
  state() {
    return (this._state);
  }

  /**
   Accept a delta-array with the state of the new instance.
   @param deltas [ [String, Any], ...]
   */
  oncreate(deltas) { console.log('GraphObject.oncreate', this); this.rollforward(deltas); }

  /**
   Accept a delta-array with changes to the state of the new instance.
   @param deltas [ [String, Any], ...]
   */
  onupdate(deltas) { console.log('GraphObject.onupdate', this); this.rollforward(deltas); }

  /**
   Notify that the instance has been deleted from the store.
   @param deltas [ [String, Any], ...] should include just the identifier property.
   */
  ondelete(deltas) { /* ?? */}

  /**
   Return an array of the values of persistent properties.
   */
  persistentValues() {
    var names = this.persistentProperties();
    var values = [];
    names.forEach(function(name) { 
      values.push(self[name]);
    });
    return (values);
  }

  /**
   Return an array of the names of managed properties.
   If not yet bound, delegate to the class for it to compute and bind to the prototype.
   */
  managedProperties() {
    return (this._managedProperties
            || this.constructor.managedProperties());
  }

  /**
   Return an array of the names of persistent properties, to be managed by the proxy.
   */
  persistentProperties() {
    //console.log('persistentProperties');
    if (! this._persistentProperties) {
      var ownProperties = Object.keys(this);
      var prototypeProperties = Object.keys(this.constructor.prototype);
      var existingProperties = ownProperties.concat(prototypeProperties);
      //console.log('persistentProperties: new');
      this.constructor.persistentProperties();
      console.log("own", ownProperties);
      console.log("prototype", prototypeProperties);
      console.log("_persistent", this._persistentProperties);
      for (const p of this._persistentProperties) {
        if (existingProperties.indexOf(p) < 0) {
          console.trace(`GraphObject.persistentProperties: property not found: '${p}'`, this);
          throw new Error(`GraphObject.persistentProperties: property not found: '${p}'`);
        }
      }
    }
    return (this._persistentProperties);
  }

  editableProperties() {
    return (this._editableProperties || this.persistentProperties());
  }

  /**
   Return an array of the names of properties subject to roll-back when a transaction
   is aborted.
   */
  transactionalProperties() {
    return (this._transactionalProperties
            || this.constructor.transactionalProperties());
  }

  /**
   compute the put/patch/delete patch given the object state
   implement as properties of the base function to permit extension
   */
  asPatch() {
    console.log('GraphObject.asPatch');
    return (GraphObject.asPatch(this));
  }

  /**
   Use a delta array to restore the state of the target instance.
   nb. also undefined values, could restrict to null
   */
  rollback(deltas = this._deltas) {
    var self = this._self;
    deltas.forEach(function(name, values) {
      var value = values[1];
      self[name] = value;
    });
    this._deltas = {};
    return (deltas);
  }

  /**
   Use a delta array to assert the new state of the target instance.
   nb. also undefined values, could restrict to null
   */
  rollforward(deltas = this._deltas) {
    var self = this._self;
    console.log('rollforward', self, deltas);
    Object.entries(deltas).forEach(function([name, values]) {
      // console.log('rollforward', name, values);
      var value = values[0];
        self[name] = value;
    });
    // console.log('rollforward.end', this);
    this._deltas = {};
    return (deltas);
  }

  // delegate to class for property definition access
  get propertyDefinitions () {
    console.log("pd", this, this.constructor, this.constructor.propertyDefinitions)
    return (this.constructor.propertyDefinitions);
  }
  getPropertyDefinition(designator) {
    return (this.propertyDefinitions.get(designator));
  }
  setPropertyDefinition(designator, definition) {
    this.propertyDefinitions.set(designator, definition);
  }

  getPropertyName (designator) {
    console.log("getPropertyName", this.propertyDefinitions, designator, typeof designator);
    return ((this.getPropertyDefinition(designator) || {}).name)
  }
  setPropertyName = function(designator, value) {
    var definition = this.getPropertyDefinition(designator);
    if (!definition) {
      definition = {};
      this.setPropertyDefinition(designator, definition);
    }
    return(definition.name = value);
  }

  getPropertyIdentifier(designator) {
    return (this.constructor.getPropertyIdentifier(designator));
  }
  setPropertyIdentifier(designator, value) {
    return (this.constructor.setPropertyIdentifier(designator, value));
  }

  getPropertyType(designator) {
    return (this.constructor.getPropertyType(designator));
  }
  setPropertyType(designator, value) {
    return (this.constructor.setPropertyType(designator, value));
  }
}


GraphObject.create = function(fromClass, definitions = {}, options = {}) {
  var object = Object.create(fromClass.prototype, definitions);
  var handler = this.createHandler(object);
  object.initializeInstance(options);
  handler = object.initializeState(handler);
  return (new Proxy(object, handler))
}

GraphObject.propertyDefinitions = new Map();
Object.defineProperty(GraphObject.prototype, "_self", {get: function() { return (this) }})
//Object.defineProperty(GraphObject.prototype, "propertyDefinitions", {get: function() { return (this.constructor.propertyDefinitions) }})

GraphObject.getPropertyDefinition = function(designator) {
    return (this.propertyDefinitions.get(designator));
}
GraphObject.setPropertyDefinition = function(designator, definition) {
  return (this.propertyDefinitions.set(designator, definition));
}

GraphObject.getPropertyName = function(designator) {
    console.log("getPropertyName", this.propertyDefinitions, designator, typeof designator);
    return ((this.getPropertyDefinition(designator) || {}).name)
}
GraphObject.setPropertyName = function(designator, value) {
    var definition = this.getPropertyDefinition(designator);
    if (!definition) {
      definition = {};
      this.setPropertyDefinition(designator, definition);
    }
    return(definition.name = value);
}

GraphObject.getPropertyIdentifier = function(designator) {
    return ((this.getPropertyDefinition(designator) || {}).identifier)
}
GraphObject.setPropertyIdentifier = function(designator, value) {
    var definition = this.getPropertyDefinition(designator);
    if (!definition) {
      definition = {};
      this.setPropertyDefinition(designator, definition);
    }
    return(definition.identifier = value);
}

GraphObject.getPropertyType = function(designator) {
    return ((this.getPropertyDefinition(designator) || {}).type)
}
GraphObject.setPropertyType = function(designator, value) {
    var definition = this.getPropertyDefinition(designator);
    if (!definition) {
      definition = {};
      this.setPropertyDefinition(designator, definition);
    }
    return(definition.type = value);
}

GraphObject.asPatch = function(object) {
    console.log('GraphObject.asPatch');
    console.log(object, object._state,);
    var patchOperator = GraphObject.asPatch[object._state];
    console.log("asPatch: using: ", patchOperator);
    return (patchOperator.call(object));
  }

GraphObject.stateClean = Symbol.for("clean");
Object.defineProperty(GraphObject.prototype, "stateClean", {get: function () { return (this.constructor.stateClean) }})
GraphObject.asPatch[GraphObject.stateClean] =
  function() {
    return ({});
  }

GraphObject.stateDeleted = Symbol.for("deleted");
Object.defineProperty(GraphObject.prototype, "stateDeleted", {get: function () { return (this.constructor.stateDeleted) }})
GraphObject.asPatch[GraphObject.stateDeleted] =
  function() {
    // iterate over all properties and collect the elements to delete
    var self = this._self;
    var id = this.getIdentifier();
    var statements = [];
    self.persistentProperties().forEach(function(name) {
      statements.push([id, name, self[name]]);
    });
    /*var type = self["_type"];
    if (type) {
      statements.push([id, "@type", type]);
    }*/
    return ({delete: statements});
  }

GraphObject.stateModified = Symbol.for("dirty");
Object.defineProperty(GraphObject.prototype, "stateDirty", {get: function () { return (this.constructor.stateModified) }})
GraphObject.asPatch[GraphObject.stateModified] =
  function() {
    // iterate over all properties and collect the elements to delete
    var self = this._self;
    var id = this.getIdentifier();
    var posts = [];
    var deletes = [];
    var deltas = this._deltas;
    self.persistentProperties().forEach(function(name) {
      if (deltas && deltas.hasOwnProperty(name)) {
        var [newValue, oldValue] = deltas[name];
        if (oldValue) {
          deletes.push([id, name, oldValue]);
        }
        if (newValue) {
          posts.push([id, name, newValue]);
        }
      };
    });
    return ({post: posts, delete: deletes});
  }

GraphObject.stateNew = Symbol.for("new");
Object.defineProperty(GraphObject.prototype, "stateNew", {get: function () { return (this.constructor.stateNew) }})
GraphObject.asPatch[GraphObject.stateNew] =
  function() {
    //console.log('GraphObject.prototype.asPatch[GraphObject.stateNew]');
    //console.log(this);
    //console.log(this.persistentProperties());
    // iterate over all properties and collect the elements to delete
    var self = this._self;
    var id = this.getIdentifier();
    var statements = [];
    // collect storage  representation agnostic  entity-attribute-value statements
    self.persistentProperties().forEach(function(name) {
      statements.push([id, name, self[name]]);
    });
    /*var type = self["_type"];
    if (type) {
      statements.push([id, "@type", type]);
    }*/
    return ({post: statements});
  }


// collect property definitions from classes on-demand.
// walk the constructor chain from the requesting class
// bind to respective initiating prototype
GraphObject.computeEffectiveProperties = function(name) {
  var props = [];
  for (var constructor = this;
       (constructor instanceof Function);
       constructor = Object.getPrototypeOf(constructor)) {
    var cprops = constructor[name];
    //console.log(constructor); console.log(cprops);
    if (!cprops) { break; }
    props = props.concat(cprops || []);
  }
  // de-duplicate
  return (Array.from(new Set(props)));
}
GraphObject.managedProperties = function() {
  var properties = this.prototype._managedProperties;
  if (!properties) {
    var tProps = this.persistentProperties();
    var pProps = this.transactionalProperties();
    properties = this.prototype._managedProperties =
      Array.from(new Set(pProps.concat(tProps)));
  }
  return (properties);
}
GraphObject.persistentProperties = function() {
  var properties = this.prototype._persistentProperties;
  if (!properties) {
    properties = this.computeEffectiveProperties('_persistentProperties');
    this.prototype._persistentProperties = properties;
  }
  return (properties);
}
GraphObject.transactionalProperties = function() {
  var properties = this.prototype._transactionalProperties;
  if (!properties) {
    properties = this.computeEffectiveProperties('_transactionalProperties');
    this.prototype._transactionalProperties = properties;
  }
  return (properties);
}

GraphObject._persistentProperties = null;
GraphObject._transactionalProperties = null;


if (window) { window.GraphObject = GraphObject; }

/*
GraphObject.hollow = "hollow";
GraphObject.persistentClean = "persistentClean";
GraphObject.persistentDeleted = "persistentDeleted";
GraphObject.persistentDirty = "persistentDirty";
GraphObject.persistentNew = "persistentNew";
GraphObject.persistentNewDeleted = "persistentNewDeleted";
GraphObject.transient = "transient";
*/

/*
class Test1 extends GraphObject {};
Test1._transactionalProperties = ['p1'];
Test1._persistentProperties = ['p2'];
class Test2 extends Test1 {};
class Test3 extends Test2 {};
Test2._transactionalProperties = ['p4', 'p5'];
Test2._persistentProperties = ['p6'];
Test3._transactionalProperties = ['p7'];
Test3._persistentProperties = ['p8'];

GraphObject.computeEffectiveProperties(new Test3(), '_persistentProperties')
GraphObject.computeEffectiveProperties(new Test3(), '_transactionalProperties')
GraphObject.computeEffectiveProperties(new Test3(), '_persistentProperties')


Test1.
  
Row = class Row extends GraphObject {
  _mail;
  constructor(name) {
    var instance = super();
    this.name = name;
    return (instance);
  }

  get email() {
    return this._email;
  }
  set email(email) {
    this._email = email.trim();
  }
}
Row._persistentProperties = ['_identifier', '_mail'];

var r = new Row("a name");
*/

// console.log('graph-object.js: loaded');

