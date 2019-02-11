// Copyright (c) 2019 datagraph gmbh

/**
 @overview

 implement a standard RDF api, following
   https://www.w3.org/community/rdfjs/
   https://www.w3.org/community/rdfjs/wiki/Comparison_of_RDFJS_libraries
   https://www.w3.org/TR/rdf-interfaces/#idl-def-RDFEnvironment
   ceur-ws.org/Vol-1268/paper13.pdf
   https://github.com/rdf-ext/rdf-ext
   https://github.com/rdfjs/data-model
 */

import {grammar as nquadsGrammar} from './n-quads-grammar.js';
import {grammar as multipartGrammar} from './multipart-grammar.js';
import { makeUUIDString } from './revision-identifier.js';
import { GraphEnvironment, predicateLeaf } from './graph-environment.js';
import { GraphObject } from './graph-object.js';
import * as nearley from '/javascripts/vendor/nearley/lib/nearley.js';

// possible alternative uri library, but wants punycode via invalid import
// import * as URI from '/javascripts/vendor/uri-js/dist/esnext/uri.js';

/**
 The class RDFEnvironment specializes the model creation functions and
 codecs for RDF.
 An environment instance provides model element creation operations in a mode which
 provides defaults from environment properties
 */
 
export class RDFEnvironment extends GraphEnvironment {
  constructor(options = {}) {
    super(options);
    this.location = (options.location ? options.location.toString() : null);
  }

  /**
   Create a statement with provisions from translation from curie terms and
   completion of relative iri.
   */
  createStatement(subject, predicate, object, graph = null) {
    //console.log({op: 'createStatement', subject: subject, predicate: predicate, object: object, graph: graph});
    if (typeof(subject) == 'string' || subject instanceof String) {
      subject = this.createNamedNode(subject);
    }
    if (typeof(predicate) == 'string' || predicate instanceof String) {
      predicate = this.createNamedNode(predicate);
    }
    if (typeof(object) == 'string' || object instanceof String) {
      try {
        var asURL = new URL(object);
        object = this.createNamedNode(asURL.href);
      } catch (_) {
        object = new SimpleString(object);
      }
    } else if (typeof(object) != 'object') {
      object = this.toLiteral(object);
    }
    if (typeof(graph) == 'string' || graph instanceof String) {
      graph = this.createNamedNode(graph);
    }
    return (createStatement(subject, predicate, object, graph));
  }
  /**
   */
  createQuad(subject, predicate, object, graph = this.location) {
    return (this.createStatement(subject, predicate, object, graph));
  }
  /**
   */
  createTriple(subject, predicate, object) {
    return (this.createStatement(subject, predicate, object));
  }
  /**
   */
  createLiteral(value, language, datatype) {
    return (createLiteral(value, language, datatype));
  }
  /**
   */
  createAnonymousNode(label) {
    return (createBlankNode(label));
  }
  /**
   */
  createBlankNode(label) {
    return (createBlankNode(label));
  }
  /**
   */
  createNamedNode(lexicalForm) {
    // allow for three case
    // - absolute url : encapsulate as is
    // - curi : convert through the context
    // - simple name : convert through context, fall-back to base iri

    if (lexicalForm.startsWith('http://') ||
        lexicalForm.startsWith('https://') ||
        lexicalForm.startsWith('urn:')) {
      return (createNamedNode(lexicalForm, null));
    } else {
      var curie = lexicalForm.match(/(\w+):(\w+)/);
      if (curie) {
        var [total, prefix, local] = curie;
        var namespace = this.findNameIdentifier(prefix);
        if (namespace) {
          return (createNamedNode(local, namespace));
        } else {
          throw new Error(`createNamedNode: unbound curie: '${curie}'`);
        }
      } else {
        var expandedForm = this.findNameIdentifier(lexicalForm);
        if (expandedForm) {
          return(createNamedNode(expandedForm, null));
        }
      }
    }
    return (createNamedNode(lexicalForm, this.baseIRI));
  }
  /**
   */
  createGraph(statements, options = {}) {
    var thisEnv = this;
    var coerceToStatement = function(datum) {
      if (datum instanceof Statement) {
        return (datum);
      } else if (datum instanceof Array) {
        return (thisEnv.createQuad(datum[0], datum[1], datum[2], datum[3]));
      } else {
        throw (new Error(`createGraph: invalid statements: '${statements}'`));
      }
    }
    if (statements) {
      statements = statements.map(coerceToStatement);
    }
    return (new Graph(statements, options));
  }
  /**
   */
  createPatch(options) {
    //console.log('RDFEnvironment.createPatch');
    //console.log(this);
    //console.log(options);
    var thisEnv = this;
    var whenCoerceToGraph = function (statements) {
      if (statements) {
        //console.log('wctg');
        //console.log(statements);
        switch(typeof(statements)) {
        case 'object':
          if (statements instanceof Array) {
            return (thisEnv.createGraph(statements));
          } else if (statements instanceof Graph) {
            return (statements);
          } else {
            throw (new Error(`createPatch: invalid statements: '${statements}'`));
          }
        }
      } else {
        return (null);
      }
    }
    if (options) {
      if (options instanceof Patch) {
        return (options);
      } else if (options instanceof Object) {
        return (new Patch({put: whenCoerceToGraph(options.put),
                           post: whenCoerceToGraph(options.post),
                           delete: whenCoerceToGraph(options.delete)}));
      } else {
        throw (new Error(`createPatch: invalid options: '${options}'`));
      }
    } else {
      new Patch({});
    }
  }

  // graph operations
  // given an RDF field, compute the equivalent object
  // - extract the class name
  // - create a respective instance
  // - for each property other than rdf:type,
  //   bind the translated object term to the translated field name in the object
  // - use the context to handle circular references

  graphResourceID (graph) {
    return( graph.resourceID() );
  }
  graphResourceIDs (graph) {
    var subjects = new Map();
    graph.forEach(function(statement) {
      subjects[statement.subject] = true;
    });
    return( Array.from(subjects.keys()) );
  }


  computeGraphObject(field, resourceID = this.graphResourceID(field).name, context = new Map()) {
    // close circularity
    var resource = context.get(resourceID);
    if (! resource) {
      var resourceClass = this.graphClassName(field, resourceID);
      if ( resourceClass ) {
        // create the object without state and set just its identifier
        resource = this.createObject(resourceClass)._self;
        resource.identifier = resourceID;
      } else {
        return ( null );
      }
      context.set(resourceID, resource);
    }
    var setEntry = function(statement) {
      if (resourceID.equals(statement.subject)) {
        var predicate = statement.predicate;
        if (! predicate.equals(NamedNode.rdf.type)) {
          var name = this.findIdentifierName(predicate);
          var object = statement.object;
          var value;
          switch( typeof(object) ) {
            case 'URI':
              value = this.computeGraphObject(field, object, context) || object;
              break;     
            default:
              value = this.termValue(object, predicate);
              break;
          }
          resource[name] = value;
        }
      }
    }
    field.map(setEntry);
    resource._state = GraphObject.stateClean;
    return( resource );
  }

  computeGraphObjects(field, resourceIDs = this.graphResourceIDs(field).map(name), context = new Map()) {
    return (resourceIDs.map(function(id) { return (computeGraphObject(field, id, context)); }));
  }

  graphClassName(field) {
    function statementClass (statement) {
      var predicate = statement.predicate;
      return ( predicate.equals(NamedNode.rdf.type) ? predicateLeaf(statement.object) : null );
    }
    return( field.some(statementClass) );
  }

  /* given some response content and an object cache,
   * extract instance identifiers, isolate the respective statements
   * find or make an instance respective each identifier
   * for each instance extract its +/- deltas
   */
  computeDeltas(content) {
    // console.log("cd", content, content.computeDeltas);
    return (content.computeDeltas(this));
  }
 
  computeObjectGraph (object) {
    var resourceID = resource['@id'];
    var entryStatement = function(entry) {
      var name = entry[0];
      var value = entry[1];
      return ( this.constructAssertion(resourceId,
                                    this.findIdentifierName(name),
                                    this.constructTerm(context, value)) );
    }
    return( Object.entries(object).map(entryStatement) );
  }

  /**
   The function toValue accepts a {@link Term} and converts it to a native value
   */
  toValue(term, predicate) {
    var datatype = term.datatype || this.fieldType(predicate);
    // console.log('toValue', term, predicate, datatype);
    if (datatype) {
      var converter = Literal.toValue[datatype.lexicalForm];
      // console.log('toValue.converter: ', converter);
      if (converter) {
        return (converter(term.lexicalForm));
      }
    }
    return (term.lexicalForm);
  }

  /**
   The function toLiteral accepts an native object and coerces it to a Literal instance.
   It distinguishes between Object specializations and primitive data.
   In those cases, use the type to compute a converter and delegate to that.
   Return unmodified any data which is already a Term.
   
   from rdflib.js
      https://github.com/linkeddata/rdflib.js/blob/master/src/literal.js
    */
  toLiteral(value) {
    if (typeof value === 'undefined' || value === null) {
      throw (new Error(`RDFEnvironment.toLiteral: invalid value: '${value}' of type '${typeof value}'`));
    } else if (value instanceof Term) {  // this is already a Term instance
      return (value);
    } else {
      var type = typeof(value);
      var converter = null;
      switch (type) {
      case 'object':
        converter = Literal.toLiteral[value.constructor.name];
        if (converter) {
          return (converter(value));
        }
        break;
      default:
        converter = Literal.toLiteral[type];
        if (converter) {
          var literal = converter(value);
          return (literal);
        }
      }
      throw (new Error(`RDFEnvironment.toLiteral: invalid value: '${value}' of type '${typeof value}'`));
    }
  }

  /**
   The function decode accepts a document, a content type and an optional continuation,
   It parses the document and returns or continues with the result, by
   retrieving the respective decoder and delegating the operation
   to that function.
   */
  decode(document, contentType, continuation = null) {
    var match;
    // console.log("rdfenv.decode: for", contentType);
    if (match = contentType.match(/([^;]+)(?:;.*)?/)) {
      var decoder = decode[match[1]];
      // console.log("rdfenv.decode: decoder", decoder);
      // must pass the content type as it can include arguments
      var decoded = decoder(document, contentType, continuation);
      // console.log("rdfenv.decode: decoded", decoded);
      return (decoded);
    } else {
      console.log("rdfenv.decode: decoder not found");
      return (null);
    }
  }
}

/**
 The abstract class Term is the root for [RDF Terms]{@link https://www.w3.org/TR/rdf11-concepts/#section-rdf-graph}
 */
export class Term {

  /**
   The function termType returns the respective class name.
   */
  get termType() {
    return (this.constructor.name);
  }
}

/**
 The abstract class Node comprises those values which can be subject, object or context
 in an RDF Quad.
 */
export class Node extends Term {
}

/**
 The class NamedNode comprises data which represents IRI.
 */
export class NamedNode extends Node {
  constructor(lexicalForm) {
    super();
    switch (typeof(lexicalForm)) {
    case 'string': break;
    case 'object' :
      lexicalForm = lexicalForm.toString();
      break;
    default:
      throw new Error(`NamedNode: invalid lexicalForm: '${lexicalForm}'`);
    }
    this.lexicalForm = lexicalForm;
  }
  /**
   The function equals returns <code>true</code> iff the argument is
   also a NamedNode and the lexical forms are equal.
   */
  equals(other) {
    return (!!other && other.termType === this.termType && other.lexicalForm === (this.lexicalForm));
  }
  /**
   The function encode formats the NamedNode as a string and returns it or
   delegate to the optional continuation.
   It implements this by retrieving the respective encoder and delegating the operation
   to that function.
   */
  encode(mediaType, continuation) {
    return (this.encode[mediaType](this, continuation));
  }
}

/**
 @param {string} lexicalForm
 @param {string} [baseIRI] - The IRI to combine with a laxicalForm which is relative.
 */
export function createNamedNode(lexicalForm, baseIRI = null) {
  if (baseIRI) {
    var uri = new URL(lexicalForm, baseIRI)
    lexicalForm = uri.href;
  }
  return (new NamedNode(lexicalForm));
}

/**
 The class UUID represented universally unique identifiers as the 
 hex-encoded string.
 */
export class UUID extends NamedNode {
  constructor(lexicalForm) {
    if (lexicalForm.startsWith('urn:uuid:')) {
      lexicalForm = lexicalForm.slice(9);
    } else if (lexicalForm.startsWith('urn:')) {
      lexicalForm = lexicalForm.slice(4);
    }
    super(lexicalForm);
  }

  toString() {
    return ('urn:uuid:' + this.lexicalForm);
  }
}

/**
 */
export function createUUID() {
  return (new UUID(makeUUIDString()));
}

NamedNode.prototype.encode['application/n-quads'] = function(object, continuation) {
  continuation('<' + object.lexicalForm + '>');
}

NamedNode.rdf = {
    type: new NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
    langString: new NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString')
  };
NamedNode.xsd = {
    boolean: new NamedNode('http://www.w3.org/2001/XMLSchema#boolean'),
    dateTime: new NamedNode('http://www.w3.org/2001/XMLSchema#dateTime'),
    decimal: new NamedNode('http://www.w3.org/2001/XMLSchema#decimal'),
    double: new NamedNode('http://www.w3.org/2001/XMLSchema#double'),
    integer: new NamedNode('http://www.w3.org/2001/XMLSchema#integer'),
    string: new NamedNode('http://www.w3.org/2001/XMLSchema#string')
  };


/**
 A BlankNode is a Node which is identified local to a Surface by a string label.
 @extends Node
 */
export class BlankNode extends Node{
  /**
   @param {string} [label]
   */
  constructor(label) {
    super();
    /**
     The local identifier
     @type string
     */
    this.label = label || `node_${BlankNode.nodeIndex++}`;
  }

  /**
   Returns true for a BlankNode with the same label
   @param {any}
   @return {boolean}
   */
  equals(other) {
    return (!!other && other.termType === this.termType && other.label.equals(this.label));
  }

  /**
   Given a media type, encode the blank node's lexical form as a string and
   return that value or delegate to the continuation.
   @param {string} mediaType
   @param {function} [continuation] If present, invoke with the encoded value and return that result.
   */
  encode(mediaType, continuation) {
    return (this.encode[mediaType](this, continuation));
  }
}

/**
 Create a new BlankNode
 @param {string} [label]
 */
export function createBlankNode (label) {
  return (new BlankNode(label));
}

BlankNode.prototype.encode['application/n-quads'] = function(object, continuation) {
  return (continuation('_:' + object.lexicalForm));
}

BlankNode.nodeIndex = 0;


/**
 The class Graph encapsulates a statement sequence with a location url,
 to augment {@link Triple} content, and a base IRI to extend relative IRI to absolute.
 */
export class Graph {
  /**
   @param {array} statements
   @param {Object} [options]
   */
  constructor(statements, options = {}) {
    /**
     the location URL
     @member {string}
     */
    this.location = options['location'];
    /** 
     the base url for operation which complete a relative iri argument
     @member {string}
     */
    this.baseIRI = options['baseIRI'];
    /** @member {array} */
    this.statements = statements || [];
  }

  /**
   Given a media type, encode the graph as a document string which represents each statement
   with its lexical form.
   return that value or delegate to the continuation.
   @param {string} mediaType
   @param {function} [continuation] If present, invoke with the encoded value and return that result.
   */
  encode(mediaType, continuation) {
    return (this.encode[mediaType](this, continuation));
  }

  /**
   Compute a set of identified deltas from the graph content.
   Each entry is an array of which the first element is the lexical identifier of a subject
   and the second is an array of roll-forward deltas.
   That is, the first value is set to a JavaScript value and the second is left undefined.
   */
  computeDeltas(environment) {
    // console.log('computeDeltas', this, environment);
    // console.log('computeDeltas.fin', environment.findIdentifierName)
    // extract all subjects , for each assemble add/remove sets
    var ids = [];
    var allDeltas = new Map();
    // console.log('allDeltas', allDeltas);
    var addStatementDelta = function(stmt, makeEntry) {
      // console.log("computeDeltas.asd:", stmt)
      var name = null;
      try { name = environment.findIdentifierName(stmt.predicate); } catch (e) {console.log("name", e);}
      var value = null;
      try { value = environment.toValue(stmt.object, stmt.predicate); } catch (e) {console.log("value", e);}
      // console.log("name", name, "value", value);
      var id = stmt.subject.lexicalForm;
      // console.log('id', id);
      // console.log('allDeltas', allDeltas);
      var idDeltas = allDeltas.get(id);
      // console.log( 'iddeltas', idDeltas);
      var delta = makeEntry(value);
      // console.log('entry', delta);
      var deltas = null;
      if (! idDeltas ) {
        deltas = {};
        idDeltas = [id, deltas];
        allDeltas.set(id, idDeltas);
      } else {
        deltas = idDeltas[1];
      }
      // console.log('set delta', deltas);
      deltas[name] = delta;
      // console.log('set delta', deltas);
      var object = null;
      if (name == '@type') {
        // create an instance to accompany the deltas
        // console.log('type');
        var stmtClass = stmt.object.lexicalForm;
        // console.log('class', stmtClass);
        object = environment.createObject(stmtClass, id);
        // console.log('Graph.computeDeltas.asd: created: ', object._state);
        // console.log('object by type', object);
        idDeltas['object'] = object;
        // console.log('object by type', object);
      }
      // console.log("computeDeltas.asd: added:", stmt);
    };
    this.statements.forEach(function(stmt) {
      addStatementDelta(stmt, function(value) { return ([value, undefined]); });
    });
    console.log('computeDeltas', allDeltas);
    return (Array.from(allDeltas.values()));
  }

  /**
   Delegate a forEach operation to the graph's statements.
   */
  forEach(op) {
    return (this.statements.forEach(op));
  }
}

/**
 @param {array} statements
 @param {Object} [options]
 */
export function createGraph(statements, options = {}) {
  return (new Graph(statements, options));
}

Graph.prototype.encode['application/n-quads'] = function(object, continuation) {
  var result = "";
  object.statements.forEach(function(s) {
    s.encode('application/n-quads',function(encoded) { result += (encoded + '\n');});
  });
  // console.log("Graph.prototype.encode['application/n-quads']", result);
  return (continuation(result));
};


/**
 The abstract class Statement comprises Triple and Quad speciaizations
 */
export class Statement {
  /**
   @param {Node} subject
   @param {NamedNode} predicate
   @param {Term} object
   @param {Node} [graph]
   */
  constructor(subject, predicate, object, graph = null) {
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;
    this.graph = graph;
  }

  /**
   Returns true for a Statement with equal terms
   @param {any}
   @return {boolean}
   */
  equals(other) {
    return (!!other && other.subject.equals(this.subject) && other.predicate.equals(this.predicate) &&
            other.object.equals(this.object) && other.graph.equals(this.graph));
  }

  /**
   Given a media type, encode the statement as a string which represents each term
   with its lexical form.
   return that value or delegate to the continuation.
   @param {string} mediaType
   @param {function} [continuation] If present, invoke with the encoded value and return that result.
   */
  encode(mediaType, continuation) {
    return (this.encode[mediaType](this, continuation));
  }

}

/**
 @param {Node} subject
 @param {NamedNode} predicate
 @param {Term} object
 @param {Node} [graph]
 */
export function createStatement(subject, predicate, object, graph) {
  return (graph ? createQuad(subject, predicate, object, graph) : createTriple(subject, predicate, object));
}


Statement.prototype.encode['application/n-quads'] = function(object, continuation) {
  var s,p,o,g = null;
  object.subject.encode('application/n-quads', function(encoded) { s = encoded; });
  object.predicate.encode('application/n-quads', function(encoded) { p = encoded; });
  object.object.encode('application/n-quads', function(encoded) { o = encoded; });
  if (object.graph) {
    object.graph.encode('application/n-quads', function(encoded) { g = encoded; });
  }
  return (continuation(s + ' ' + p + ' ' + o + ' ' + (g ? (g + ' ') : '') + '.'));
}



/**
 The class Triple specializes {@link Statement} for those with just subject, predicate, and
 object terms.
 */
export class Triple extends Statement {
  /**
   @param {Node} subject
   @param {NamedNode} predicate
   @param {Term} object
   */
  constructor(subject, predicate, object) {
    super(subject, predicate, object, null);
  }
}

/**
 @param {Node} subject
 @param {NamedNode} predicate
 @param {Term} object
 */
export function createTriple(subject, predicate, object) {
  return (new Triple(subject, predicate, object));
}


/**
 The class Quad specializes {@link Statement} for those with subject, predicate,
 object, and graph terms.
 */
export class Quad extends Statement {
  /**
   @param {Node} subject
   @param {NamedNode} predicate
   @param {Term} object
   @param {Node} [graph]
   */
  constructor(subject, predicate, object, graph) {
    super(subject, predicate, object, graph);
  }
}

/**
 The function createQuad combines terms into a Quad instance.
 @param {Node} subject
 @param {NamedNode} predicate
 @param {Term} object
 @param {Node} [graph]
 */
export function createQuad(subject, predicate, object, graph) {
  return (new Quad(subject, predicate, object, graph));
}


/**
 The class Literal represents an RDF literal.
 The specializations LangString and SimpleString provide for cases where
 a language tag or no datatyoe is provided
 */
export class Literal extends Term {
  constructor(lexicalForm, language, datatype) {
    super();
    this.lexicalForm = lexicalForm;
    this.language = language;
    this.datatype = datatype;
  }

  /**
   */
  equals(other) {
    return (!!other && other.termType === this.termType && other.value === this.value &&
            other.language === this.language && other.datatype.equals(this.datatype));
  }

  /**
   */
  encode(mediaType, continuation) {
    return (this.encode[mediaType](this, continuation));
  }
}

window.classLiteral = Literal;

Literal.prototype.encode['application/n-quads'] = function(object, continuation) {
  var type = object.datatype;
  var language = object.language;
  if (type) {
    return (continuation('"' + object.lexicalForm + '"^^<' + type.lexicalForm + '>'));
  } else if (language) {
    return (continuation('"' + object.lexicalForm + '"@' + language));
  } else {
    return (continuation('"' + object.lexicalForm + '"'));
  }
}

/**
 A dictionary of function to convert native data to an RDF Term
 */
Literal.toLiteral = {};

Literal.toLiteral['Date'] = function fromDate(value) {
  if (!(value instanceof Date)) {
    throw new TypeError('Invalid argument to Literal.fromDate()')
  }
  let d2 = function (x) {
    return ('' + (100 + x)).slice(1, 3)
  }
  let date = '' + value.getUTCFullYear() + '-' + d2(value.getUTCMonth() + 1) +
    '-' + d2(value.getUTCDate()) + 'T' + d2(value.getUTCHours()) + ':' +
    d2(value.getUTCMinutes()) + ':' + d2(value.getUTCSeconds()) + 'Z'
  return (createLiteral(date, null, NamedNode.xsd.dateTime));
}

Literal.toLiteral['boolean'] = function fromBoolean(value) {
  return (createLiteral(value.toString(), null, NamedNode.xsd.boolean));
}

Literal.toLiteral['number'] = function fromNumber(value) {
  var asString = value.toString();
  return (createLiteral(asString,
                        null,
                        ((asString.indexOf('.') >= 0) ? NamedNode.xsd.decimal : NamedNode.xsd.integer)));
}

Literal.toLiteral['string'] = function fromString(value) {
  return (createLiteral(value, null, null));
}

/**
 A dictionary of functions to convert an RDF Term to native data.
 */
Literal.toValue = {};
Literal.toValue[NamedNode.xsd.boolean.lexicalForm] = function(lexicalForm) { return (Boolean(lexicalForm)); };
Literal.toValue[NamedNode.xsd.dateTime.lexicalForm] = function(lexicalForm) { return (new Date(lexicalForm)); };
Literal.toValue[NamedNode.xsd.decimal.lexicalForm] = function(lexicalForm) { return (Number(lexicalForm)); };
Literal.toValue[NamedNode.xsd.double.lexicalForm] = function(lexicalForm) { return (Number(lexicalForm)); };
Literal.toValue[NamedNode.xsd.integer.lexicalForm] = function(lexicalForm) { return (Number(lexicalForm)); };
Literal.toValue[NamedNode.xsd.string.lexicalForm] = function(lexicalForm) { return (lexicalForm); };

/**
 Create a Literal instance. Given the appropriate arguments creates either a LangString
 a typed Literal or a SimpleString
 @param {string} value
 @param {(string|null)} language
 @param {(string|null)} datatype
 */
export function createLiteral(value, language, datatype) {
  if (language) {
    return (new LangString(value, language));
  } else if (datatype) {
    return (new Literal(value, language, datatype));
  } else {
    return (new SimpleString(value));
  }
}

/**
 The class SimpleString specializes {@link Literal} for those strings without a language tag.
 @extends Literal
 */
export class SimpleString extends Literal {
  constructor(lexicalForm) {
    super(lexicalForm, null, NamedNode.xsd.string);
  }
  equals(other) {
    return ((other === this.lexicalForm) || super.equals(other));
  }
}             

/**
 The class LangString specializes {@link Literal} for thos strings with language tag.
 @extends Literal
 */
export class LangString extends Literal {
  constructor(lexicalForm, language) {
    super(lexicalForm, language, NamedNode.rdf.langString);
  }
}

/**
 The class Patch encapsulates delete, post and put constituents.
 Each is provided as a Graph or graph designator.
 As the latter a statement sequence is wrapped as Graph while
 a string is decoded.
 */
export class Patch {
  /**
   @param {Object} options
   @param {string} options.contentType - The patch section media type
   @param {Graph} [options.delete]
   @param {Graph} [options.post]
   @param {Graph} [options.put]
   */
  constructor(options = {}) {
    this.contentType = options.contentType || 'application/n-quads';
    var thisContentType = this.contentType;
    var whenGraph = function (statements) {
      //console.log('Patch.constructor');
      //console.log(statements);
      switch(typeof(statements)) {
      case 'object':
        if (statements instanceof Array) {
          return (createGraph(statements));
        } else if (statements instanceof Graph) {
          return (statements);
        } else {
          return (null);
        }
      case 'string':
        return(decode(statements, thisContentType, null));
      default:
        return (null);
      }
    }
    this.put = whenGraph(options.put);
    this.post = whenGraph(options.post);
    this.delete = whenGraph(options.delete);
  }

  encode(mediaType, continuation) {
    return (this.encode[mediaType](this, continuation));
  }
  computeDeltas(environment) {
    // extract all subjects , for each assemble add/remove sets
    var ids = [];
    var deltaMap = new Map();
    var addStatementDelta = function(stmt, makeEntry) {
      var name = environment.findIdentifierName(stmt.predicate);
      var value = environment.toValue(stmt.object, stmt.predicate);
      var id = stmt.subject.lexicalForm;
      var idDeltas = deltaMap.get(id);
      var delta = makeEntry(value);
      var object = null;
      if (name == '@type') {
        var stmtClass = predicateLeaf(stmt.object)
        object = environment.createObject(stmtClass, id);
        // console.log('computeDeltas: created: ', object._state);
      }
      var deltas = null;
      if (! idDeltas ) {
        deltas = {};
        deltaMap.set(id, [id, deltas]);
      } else {
        deltas = idDeltas[1];
      }
      if (object) {
        idDeltas.object = object;
      }
      deltas[name] = delta;
    };
    this.delete.forEach(function(stmt) {
      addStatementDelta(stmt, function(value) { return ([undefined, value]); });
    });
    this.post.forEach(function(stmt) {
      addStatementDelta(stmt, function(value) { return ([value, undefined]); });
    });
    this.put.forEach(function(stmt) {
      addStatementDelta(stmt, function(value) { return ([value, undefined]); });
    });
  return (Array.from(deltaMap.values()));
  }
}

/**
 Instantiate a new Patch given the delete, post, and put constituents.
 @param {Object} [options] Provide delete, post, and put constituent arrays.
 */
export function createPatch(options = {}) {
  return (new Patch(options));
}

/**
 Encode a patch as multipart/related with one section for each of the
 delete, put , and post constituents of the patch.
 */
Patch.prototype.encode['multipart/related'] = function(object, continuation) {
    //console.log('Patch.prototype.encode[multipart/related]');
    //console.log(object);
    //console.log(continuation);
    var boundary = "PATCH";
    var crlf = '\r\n';
    var body = "";
    var separator = "--" + boundary;
    var appendSection = function(content, method) {
      //console.log('Patch.prototype.encode: ' + method);
      //console.log('Patch.prototype.encode: ' + content);
      if (content) {
        // encode each section as per the patch content type with
        // appropriate section headers
        content.encode(object.contentType, function(e) {
          if (e && e.length > 0) {
            body += separator + crlf;
            body += `X-HTTP-Method-Override: ${method}${crlf}`;
            body += `ContentType: ${object.contentType}${crlf}${crlf}`;
            body += e;
          }
        });
      }
    }
    appendSection(object.delete, "DELETE");
    appendSection(object.put, "PUT");
    appendSection(object.post, "POST");
    body += separator + "--" + crlf;
    return (continuation(body, {boundary: boundary}));
  };


/**
 The static function decode accepts a document string, a media type, and a
 continuation.
 It decodes the string as n RDF term and delegates to the continuation.
 The implementation are indexed bx media type in the dictionary which is bound
 to the decode symbol.
 */
export function decode(object, contentType, continuation) {
  if (match = contentType.match(/([^;]+)(?:;.*)?/)) {
    var decoder = decode[match[1]];
    // console.log("decode: decoder", decoder);
    // must pass the content type as it can include arguments
    var decoded = decoder(document, contentType, continuation);
    // console.log("rdfenv.decode: decoded", decoded);
    return (decoded);
  } else {
    console.log("decode: decoder not found");
    return (null);
  }
}

decode['application/n-quads'] = function(document, contentType, continuation) {
  // console.log("decode['application/n-quads']");
  // console.log('nearley', nearley);
  // console.log('nearley.Parser', nearley.Parser);
  // console.log('nearley.Grammar', nearley.Grammar);
  // console.log('nquadsGrammar', nquadsGrammar);
  // console.log('make parser');
  var parser = null;
  try {
    parser = new nearley.Parser(nearley.Grammar.fromCompiled(nquadsGrammar));
  } catch (error) {
    console.log("from grammar failed: ", error);
    return (null);
  }
  try {
    var statements = parser.feed(document).results[0];
    var graph = createGraph(statements);
    // console.log('decoded', graph);
    return (continuation ? continuation(graph) : graph);
  } catch (error) {
    console.log("decode['application/n-quads'] failed", error);
    return (null);
  }
}

decode['multipart/related'] = function(document, contentType, continuation) {
  // segment into parts, parse each, collate respective delete/post/put sections
  // create and return a patch object
  var parser = new nearley.Parser(nearley.Grammar.fromCompiled(multipartGrammar));
  var posts = [];
  var puts = [];
  var deletes = [];
  var parsed = parser.feed(document);
  // console.log("decode['multipart/related']: parsed", parsed)
  // console.log("decode['multipart/related']: results", parsed.results)
  var parts = parsed.results[0];
  // console.log("decode['multipart/related']: parts", parts)
  if (parts) {
    parts.forEach(function([headers, content]) {
      // console.log("decode['multipart/related']: part", [headers, content])
      var contentParser = new nearley.Parser(nearley.Grammar.fromCompiled(nquadsGrammar));
      var method = headers['X-HTTP-Method-Override'];
      var parsed = contentParser.feed(content);
      var statements = parsed.results[0];
      // console.log("decode['multipart/related']: part statements", method, statements)
      switch(method.toUpperCase()) {
      case 'DELETE':
        deletes = deletes.concat(statements);
        // console.log("decode['multipart/related']: deletes", deletes);
        break;
      case 'POST':
        // console.log("decode['multipart/related']: posts", posts);
        posts = posts.concat(statements);
        break;
      case 'PUT':
        puts = puts.concat(statements);
        break;
      default:
        console.log(`decode['multipart/related']: invalid method '${method.toUpperCase()}'`);
      }
    });
  }
  var patch = {delete: deletes, post: posts, put: puts};
  // console.log("decode['multipart/related']: prepatch", patch);
  patch = createPatch(patch);
  // console.log("decode['multipart/related']: patch", patch);
  return (continuation ? continuation(patch) : patch);
}

/**
 The static function encode accepts an object, a media type, and a continuation.
 It encodes the data as a string and delegates to the continuation.
 Numbers and strings are encoded in-line while objects delegate to the respective method.
 */
export function encode(object, mediaType, continuation) {
  return (encode[mediaType](object, continuation))
}

encode['application/n-quads'] = function(object, continuation) {
  var type = typeof(object);
  switch (type) {
  case 'number':
    continuation(object.toString() + "^^<" + dataTypeIRI(object) + ">");
    break;
  case 'string':
    continuation('"' + object + '"');
    break;
  case 'object':
    if (object instanceof Array) {
      object.forEach(function(element) {
        element.encode('application/n-quads', continuation);
      });
    } else {
      object.encode('application/n-quads', continuation);
    }
    break;
  default:
    continuation("nil");
  }
}


