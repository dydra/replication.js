// Copyright (c) 2019 datagraph gmbh

/**
 @overview

 @typedef {Object} Context
 */

import { GraphObject } from "./graph-object.js";

/**
 The abstract GraphEnvironment class defines the interface to graphs
 and their elements.
 @abstract
 @property context - A dictionary which maps bi-directionally  between property names and IRI
 @property module - A dictionary which maps class names to classes.
 */

export class GraphEnvironment {
  /**
   @param {Object} options
   @param {(string|URL|Context)} options.context
   @param {Object} options.module
   */
  constructor(options = {}) {
    //this.context = null;
    this.resolveContext(options['context']);
    this.module = options['module'] || {};
  }

  /**
   Return the base IRI from this environment's context.
   @return {string} - the base IRI
   */
  get baseIRI() {
    return (this.context['@base'] || null);
  }

  /**
   Accept a context designator, retrieve if necessary, expand all definitions,
   and bind the environment's context property to it.
   @param {(string|URL|Context)} context - The context to resolve.
   */
  resolveContext(context) {
    var thisEnv = this;
    var expandContext = function(context) {
      var base = context['@base'];
      Object.values(context).forEach(function(def) {
        var uri = def['@id'];
        if (uri) {
          def['@id'] = (base ? new URL(uri, base).href: new URL(uri).href);
        }
      });
      return (context);
    }
    var fetchContext = function(context) {
      fetch(context).then(function(response) {
        thisEnv.context = expandContext(response.json());
      })
    }
    if (context) {
      switch (typeof(context)) {
      case 'object':
        if (context instanceof URL) {
          fetchContext(context.href);
        } else {
          this.context = expandContext(context);
        }
        break;
      case 'string':
        fetchContext(context);
        break;
      default:
        throw (new TypeError(`resolveContext: invalid context: ${context}` ) );
      }
    } else {
      this.context = {};
    }
  }

  /**
   Return the identifier for the root node of the given Graph.
   @param {Graph} graph
   */
  graphResourceID (graph) {
    throw (new Error('GraphEnvironment.fieldResourceID must be implemented'));
  }

  /**
   Return the identifers for all nodes in the given Graph.
   @param {Graph} graph
   */
  graphResourceIDs (graph) {
    throw (new Error('GraphEnvironment.fieldResourceIDs must be implemented'));
  }

  /**
   Given a property identifier, return the definition from the environment's context.
   @param {(string|URL)} identifier - An identifier present in the context
   @return {PropertyDefinition}
   @todo The definition should be a standard JavaScript property descriptor
   @todo Change name to getPropertyDescriptor
   */
  fieldDefinition(identifier) {
    var def;
    // console.log("fieldDefinition", identifier);
    switch (typeof(identifier)) {
    case 'string': // field name
      return (this.context[name] || null);
    case 'object': // url
      var namestring = identifier.lexicalForm;
      def = this.context[namestring];
      if (def) {
        return (def);
      } else {
        var localPart = predicateLeaf(identifier);
        def = this.context[localPart];
        if (def) {
          this.context[namestring] = def;
          return (def);
        } else {
          return (this.context[namestring] = {});
        }
      }
    default:
      return (null);
    }
  }

  /**
   Given a property identifier, return the type from its definition 
   @todo Change name to getPropertyType
   */
  fieldType(identifier) {
    var def = this.fieldDefinition(identifier);
    return (def ? def['@type'] : null)
  }

  /**
   Given an IRI, return the property name associated with it in the environment.
   If none is present in the context, add a definition which specifies the IRI leaf as the name.
   The first probe searches the context for a property definition which specifies the iri as its @id.
   That result is then cached for future references.
   @oaram {(string|URL)} uri
   */
  findIdentifierName(uri) {
    // console.log("fin", uri);
    var uriNamestring = null;
    switch (typeof(uri)) {
    case 'string': // iri as string
      uriNamestring = uri;
      break;
    case 'object': // url
      uriNamestring = uri.lexicalForm;
      break;
    default:
      return (null);
    }
    var fieldName = this.context[uriNamestring];
    if (! fieldName) {
      for (var name in this.context) {
        var def = this.context[name];
        var id = def['@id'];
        if (id == uriNamestring) {
          fieldName = name;
          this.context[uriNamestring] = name;
          break;
        }
      }
    }
    if (! fieldName) {
      fieldName = this.context[uriNamestring] = predicateLeaf(uri);
    }

    // console.log("fin=", fieldName);
    return ( fieldName );
  }

  /**
   Given a property name, return the IRI associated with it in the environment.
   @param {string} name
   */
  findNameIdentifier(name) {
    // console.log('fni');
    // console.log(this);
    // console.log(this.context);
    var uri = null;
    var def = this.context[name];
    // console.log('fni: ' + name);
    if (def) {
      uri = def['@id'];
      // console.log(uri);
      return (uri || null);
    }
    // console.log(uri);
    return (uri);
  }

  /**
   Given a Graph, and a prototype, compute the per-id state deltas.
   @abstract
   */
  computeDeltas(graph, prototypeObject) {
    throw (new Error('GraphEnvironment.computeDeltas must be implemented'));
  }

  /**
   Given a Graph, extract the first subject term, extract its description and instantiate it.
   @abstract
   */
  computeGraphObject(graph, identifier) {
    throw (new Error('GraphEnvironment.computeGraphObject must be implemented'));
  }
  /**
   Given a Graph and a list of identifiers, extract their descriptions and instantiate them.
   @param {Graph} graph
   @param {Array} identifiers - The sought identifiers
   @abstract
   */
  computeGraphObjects(graph, identifiers) {
    throw (new Error('GraphEnvironment.computeGraphObjects must be implemented'));
  }
  /**
   @param {Object} object
   @abstract
   */
  computeObjectGraph(object) {
    throw (new Error('GraphEnvironment.computeObjectGraph must be implemented'));
  }

  /**
   Given subject, predicate, object and graph terns, construct and return a statement
   @abstract
   @param {Node} subject
   @param {NamedNode} predicate
   @param {Term} object
   @param {Node} [graph]
   */
  createStatement(subject, predicate, object, context) {
    throw (new Error('GraphEnvironment.createStatement must be implemented'));
  }
  /**
   @abstract
   */
  createGraph(statements, options) {
    throw (new Error('GraphEnvironment.createGraph must be implemented'));
  }
  /**
   @abstract
   */
  createLiteral(value, options) {
    throw (new Error('GraphEnvironment.createLiteral must be implemented'));
  }
  /**
   @abstract
   */
  createAnonymousNode(label) {
    throw (new Error('GraphEnvironment.createAnonymousNode must be implemented'));
  }
  /**
   @abstract
   */
  createNamedNode(identifier) {
    throw (new Error('GraphEnvironment.createIdentifiedNode must be implemented'));
  }

  /**
   Given a class name return a known class instance or create it 
   @param {string} className
   */
  ensureClass(className) {
    var classInstance = this.getClass(className);
    if (!classInstance) {
      if ((typeof className == 'string') && className.match(/^[a-zA-Z0-9_]+$/)) {
        try { classInstance = eval(className); }
        catch(e) { // unknown class, define it
          classInstance = class extends GraphObject{};
          Object.setPrototypeOf(classInstance.prototype, GraphObject.prototype);
          Object.setPrototypeOf(classInstance, GraphObject);
          // restrict the cache to this environment
          // window[className] = classInstance; //does the next step make sense given this?
        }
        theGraphEnvironment.setClass(className, classInstance);
      } else {
        throw new Error(`ensureClass: invalid class name ${className}`);
      }
    }
    return (classInstance);
  }

  setClass(className, classInstance) {
    this.module[className] = classInstance;
  }
  getClass(cassName) {
    return (this.module[className]);
  }

  /**
   Given a class name, the instance identifier and an initial state,
   instantiate the object, assign the initial state, create its proxy and return that.
   @param {string} className
   @param {string} identifier
   @param {Object} [state]
   */
  createObject(className, identifier, state = {}) {
    // console.log('createObject', className, 'prototype', className.prototype)
    var classInstance = this.ensureClass(className);
    // console.log('class', classInstance);
    // console.log('state', state);
    var defs = {};
    if (classInstance) {
      var instance = Object.create(classInstance.prototype, defs);
      instance.setIdentifier(identifier);
      instance.initializeState(instance.stateClean);
      // apply state after initialization, but before proyxing
      Object.entries(state).forEach(function([entryKey, entryValue]) {
        instance[entryKey] = entryValue;
      });
      var proxy = instance.createProxy();  // do not test, just require the operator
      // console.log('graph-environment.createObject: instance', typeof(instance), instance);
      // console.log('graph-environment.createObject: proxy', typeof(proxy), proxy);
      // console.log('graph-environment.createObject: instance.constructor', instance.constructor);
      // console.log('graph-environment.createObject: instance.constructor', proxy.constructor);
      // console.log('graph-environment.createObject: state', instance._state);
      return( proxy );
    } else {
      console.warn(`graph-environment.createObject: class not found '${className}'`);
      return (state);
    }
  } 
}


/**
 Given an IRI return the last element of its path.
 @param {(string|URL)} url
 @returns {string}
 */
export function predicateLeaf(url) {
  var asURL = (url instanceof URL) ? url :
              (typeof url === 'string' || url instanceof String) ? new URL(url) :
              (url.type == "iri" || url.type == "uri" || url.type == "url") ? new URL(url.value) :
              (url.lexicalForm) ? new URL(url.lexicalForm) : undefined;
  return ( (asURL.hash.length > 0) ? asURL.hash.slice(1) : asURL.pathname.split('/').pop() );
}

