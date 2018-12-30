// Copyright (c) 2019 datagraph gmbh

/*
The class GraphObject is an abstract class which wraps each concrete
instance in a proxy to mediate property access and implement a jdo/jpa-like
state machine to control instance.
The logic distinguished detached/attached situations wrt a ReplicaObjectStore
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

class GraphStateError extends Error {
  constructor(state, operation) {
    super(`Operation (${operation}) is ìnvalid in state (${state}).`);
    this.state = state;
    this.operation = operation;
  }
}

export class GraphObject {
  constructor() {
    this._state = GraphObject.stateNew;
    this._store = null;
    this._transaction = null;
    this._patch = null;
    // out-of-line initialization to avoid proxy
    this.initializeInstance(...arguments);

    var proxy = new Proxy (this, {
      set(target, name, value) {
        //console.log({set: name, value: value});
        var properties = target.constructor.managedProperties();
        if ((properties == [] && (name[0] != '_'))
            || properties.includes(name)) {
          // if the property is managed
          switch (target._state) {
            case GraphObject.stateNew:
              break;
            case GraphObject.stateClean:
              target._state = GraphObject.stateModified;
              break;
            case GraphObject.stateDeleted:
              throw new GraphStateError(target._state, "set");
          }
          if (target._store) {
            // attached
            //console.log('persistent set');
            var oldValue = target[name];
            if (oldValue != value ) {
              var patch = target._patch;
              if (! patch) {
                patch = {};
                target._patch = patch;
              }
              var delta = patch[name];
              if (delta) {
                if (delta[1] == value) {
                  // if setting back to the original value, delete the entry
                  patch.delete(name);
                } else {
                  // otherwise replace the new value
                  delta[0] = value;
                }
              } else {
                // iff this is the first change, record [new,old]
                delta = [value, oldValue];
                patch[name] = delta;
              }
            }
          } else {
          // detached or no active transaction
          }
        }
        // set the property
        target[name] = value;
        return true;
      },
      get(target, name) {
        //console.log({get: name});
        switch (name) {
        case '_self':  // special case to get the target
          //console.log('as self');
          //console.log(target);
          return (target);
        default:
          var properties = target.persistentProperties();
          if ((properties == [] && (name[0] != '_'))
              || properties.includes(name)) {
            // if the property is managed
            /*
            if (target._transaction) {
              switch (target._state) {
              default: // read in all states except new (ie. also deleted)
                return (target[name]);
              case GraphObject.stateNew:
                throw new GraphStateError(GraphObject.stateNew, "get");
              }
            }*/
          }
          return (target[name]);
        }
      }
    });
    return (proxy);
  }

  initializeInstance() {}

  get identifier () {
    throw new Error("A GraphObject requires an identifier");
  }
  set identifier (value) {
    throw new Error("A GraphObject requires an identifier");
  }
  get state() {
    return (this._state);
  }
  get repository() {  // see
    return (this._repository);
  }

  oncreate() {}
  onupdate() {}
  ondelete() {}

  persistentValues() {
    var self = this._self || this;
    var names = self.persistentProperties();
    var values = [];
    names.forEach(function(name) { 
      values.push(self[name]);
    });
    return (values);
  }
  managedProperties() {
    return (this._managedProperties
            || this.constructor.managedProperties());
  }
  persistentProperties() {
    //console.log('persistentProperties');
    if (! this._persistentProperties) {
      var validProperties = Object.keys(this).concat(Object.keys(this.constructor.prototype));
      //console.log('persistentProperties: new');
      this.constructor.persistentProperties();
      for (const p of this._persistentProperties) {
        if (validProperties.indexOf(p) < 0) {
          throw new Error(`GraphObject.persistentProperties: property node bound: '${p}'`);
        }
      }
    }
    return (this._persistentProperties);
  }
  transactionalProperties() {
    return (this._transactionalProperties
            || this.constructor.transactionalProperties());
  }

  /* asPatch
   * compute the put/patch/delete patch given the object state
   * implement as properties of the base function to permit extension
   */
  asPatch() {
    //console.log('GraphObject.asPatch');
    //console.log(this);
    var self = this._self || this;
    //console.log(self);
    // compute the patch for the target instance as per its state
    //console.log(`for state: '${self._state}’`);
    return (self.asPatch[self._state].call(self));
  }

}

GraphObject.stateClean = "clean";
GraphObject.prototype.asPatch[GraphObject.stateClean] =
  function() {
    return ({});
  }

GraphObject.stateDeleted = "deleted";
GraphObject.prototype.asPatch[GraphObject.stateDeleted] =
  function() {
    // iterate over all properties and collect the elements to delete
    var self = this;
    var id = self.identifier;
    var statements = [];
    self.persistentProperties().forEach(function(name) {
      statements.push([id, name, self[name]]);
    });
    statements.push([id, "@type", self.constructor.name]);
    return ({delete: statements});
  }

GraphObject.stateNew = "new";
GraphObject.prototype.asPatch[GraphObject.stateNew] =
  function() {
    //console.log('GraphObject.prototype.asPatch[GraphObject.stateNew]');
    //console.log(this);
    //console.log(this.persistentProperties());
    // iterate over all properties and collect the elements to delete
    var self = this;
    var id = self.identifier;
    var statements = [];
    self.persistentProperties().forEach(function(name) {
      statements.push([id, name, self[name]]);
    });
    statements.push([id, "@type", self.constructor.name]);
    return ({post: statements});
  }


GraphObject.stateModified = "dirty";
GraphObject.prototype.asPatch[GraphObject.stateModified] =
  function() {
    // iterate over all properties and collect the elements to delete
    var self = this;
    var id = self.identifier;
    var posts = [];
    var deletes = [];
    self.persistentProperties().forEach(function(name) {
      if (self._patch && self._patch.hasOwnProperty(name)) {
        var [newValue, oldValue] = self._patch[name];
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


// collect property definitions from classes and bind to prototypes
GraphObject.computeEffectiveProperties = function(name) {
  var props = [];
  for (constructor = this;
       (constructor instanceof Function);
       constructor = Object.getPrototypeOf(constructor)) {
    var cprops = constructor[name];
    //console.log(constructor); console.log(cprops);
    if (!cprops) { break; }
    props = props.concat(cprops || []);
  }
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

GraphObject.stateClean =
  GraphObject.prototype.stateClean = "clean";
GraphObject.stateDeleted =
  GraphObject.prototype.stateDeleted =  "deleted";
GraphObject.stateModified =
  GraphObject.prototype.stateModified =  "dirty";
GraphObject.stateNew =
  GraphObject.prototype.stateNew =  "new";

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

var r = new Row("a name");
*/

console.log('Graph-object.js: loaded');

