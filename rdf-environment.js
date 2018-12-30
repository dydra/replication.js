// Copyright (c) 2019 datagraph gmbh

// implement a standard RDF api
// follows
//   https://www.w3.org/community/rdfjs/
//   https://www.w3.org/community/rdfjs/wiki/Comparison_of_RDFJS_libraries
//   https://www.w3.org/TR/rdf-interfaces/#idl-def-RDFEnvironment
//   ceur-ws.org/Vol-1268/paper13.pdf
//   https://github.com/rdf-ext/rdf-ext
//   https://github.com/rdfjs/data-model

import * as nquadsGrammar from './n-quads-grammar.js';
import { makeUUIDString } from './revision-identifier.js';
import { GraphEnvironment, predicateLeaf } from './graph-environment.js';
import { GraphObject } from './graph-object.js';

// possible alternative uri library, but wants punycode via invalid import
// import * as URI from '/javascripts/vendor/uri-js/dist/esnext/uri.js';

export class RDFEnvironment extends GraphEnvironment {
  constructor(options = {}) {
    super(options);
    this.location = (options.location ? options.location.toString() : null);
  }

  // an instance provides model element creation operations in a mode which
  // may depend on environment properties
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
  createLiteral(value, language, datatype) {
    return (createLiteral(value, language, datatype));
  }
  createAnonymousNode(label) {
    return (createBlankNode(label));
  }
  createBlankNode(label) {
    return (new BlankNode(label));
  }
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
  createQuad(subject, predicate, object, graph = this.location) {
    return (this.createStatement(subject, predicate, object, graph));
  }
  createTriple(subject, predicate, object) {
    return (this.createStatement(subject, predicate, object));
  }
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


  computeGraphObject(field, resourceID = RDFFieldResourceID(field).name, context = {}) {
    // close circularity
    var resource = context[resourceID];
    if (! resource) {
      var resourceClass = this.graphClassName(field);
      if ( resourceClass ) {
        // create the object without state and set just its identifier
        resource = this.createObject(resourceClass)._self;
        resource.identifier = resourceID;
      } else {
        return ( null );
      }
      context[resourceID] = resource;
    }
    var setEntry = function(statement) {
      if (resourceID.equals(statement.subject)) {
        var predicate = statement.predicate;
        var name = RDFPredicateName(LDContext, predicate);
        if (name != "type") {
          var object = statement.object;
          var value;
          switch( typeof(object) ) {
            case 'URI':
              value = computeGraphObject(field, context, object) || object;
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

  computeGraphObjects(field, resourceIDs = RDFFieldResourceIDs(field).map(name), context = {}) {
    return (resourceIDs.map(function(id) { return (computeGraphObject(field, id, context)); }));
  }

  graphClassName(field) {
    function statementClass (statement) {
      var predicate = statement.predicate;
      return ( predicate.equals(NamedNode.rdf.type) ? predicateLeaf(statement.object) : null );
    }
    return( field.some(statementClass) );
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

  toValue(term, predicate) {
    var datatype = term.datatype || this.fieldType(predicate);
    if (datatype) {
      var converter = Literal.toValue[datatype];
      if (converter) {
        return (converter(term.lexicalForm));
      }
    }
    return (term.lexicalForm);
  }

  // from rdflib.js
  //    https://github.com/linkeddata/rdflib.js/blob/master/src/literal.js
  toLiteral(value) {
    if (typeof value === 'undefined' || value === null) {
      throw (new Error(`RDFEnvironment.toLiteral: invalid value: '${value}' of type '${typeof value}'`));
    } else if (value instanceof Term) {  // this is a Term instance
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
          return (converter(value));
        }
      }
      throw (new Error(`RDFEnvironment.toLiteral: invalid value: '${value}' of type '${typeof value}'`));
    }
  }
}


export class Term {
  get termType() {
    return (this.constructor.name);
  }
}

export class Node extends Term {
}

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
  equals(other) {
    return (!!other && other.termType === this.termType && other.lexicalForm === (this.lexicalForm));
  }
  encode(mediaType, continuation) {
    return (this.encode[mediaType](this, continuation));
  }
}

export function createNamedNode(lexicalForm, baseIRI = null) {
  if (baseIRI) {
    lexicalForm = new URL(lexicalForm, baseIRI).href;
  }
  return (new NamedNode(lexicalForm));
}

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


export class BlankNode extends Node{
  constructor(label) {
    super();
    this.label = label;
  }
  equals(other) {
    return (!!other && other.termType === this.termType && other.label.equals(this.label));
  }
  encode(mediaType, continuation) {
    return (this.encode[mediaType](this, continuation));
  }
}

export function createBlankNode (label) {
  return (new BlankNode(label));
}

BlankNode.prototype.encode['application/n-quads'] = function(object, continuation) {
  return (continuation('_:' + object.lexicalForm));
}


export class Graph {
  constructor(statements, options = {}) {
    this.statements = statements || [];
    this.location = options['location'];
    this.baseIRI = options['baseIRI'];
  }

  encode(mediaType, continuation) {
    return (this.encode[mediaType](this, continuation));
  }
}

export function createGraph(statements, options = {}) {
  return (new Graph(statements, options));
}

Graph.prototype.encode['application/n-quads'] = function(object, continuation) {
  var result = "";
  object.statements.forEach(function(s) {
    s.encode('application/n-quads',function(encoded) { result += (encoded + ' \n');});
  });
  return (continuation(result));
};


export class Statement {
  constructor(subject, predicate, object, graph = null) {
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;
    this.graph = graph;
  }
  equals(other) {
    return (!!other && other.subject.equals(this.subject) && other.predicate.equals(this.predicate) &&
            other.object.equals(this.object) && other.graph.equals(this.graph));
  }

  encode(mediaType, continuation) {
    return (this.encode[mediaType](this, continuation));
  }

}

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



export class Triple extends Statement {
  constructor(subject, predicate, object) {
    super(subject, predicate, object, null);
  }
}

export function createTriple(subject, predicate, object) {
  return (new Triple(subject, predicate, object));
}


export class Quad extends Statement {
  constructor(subject, predicate, object, graph) {
    super(subject, predicate, object, graph);
  }
}

export function createQuad(subject, predicate, object, graph) {
  return (new Quad(subject, predicate, object, graph));
}


export class Literal extends Term {
  constructor(lexicalForm, language, datatype) {
    super();
    this.lexicalForm = lexicalForm;
    this.language = language;
    this.datatype = datatype;
  }

  equals(other) {
    return (!!other && other.termType === this.termType && other.value === this.value &&
            other.language === this.language && other.datatype.equals(this.datatype));
  }

  encode(mediaType, continuation) {
    return (this.encode[mediaType](this, continuation));
  }
}

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

Literal.toValue = {};
Literal.toValue[NamedNode.xsd.boolean] = function(lexicalForm) { return (Boolean(lexicalForm)); };
Literal.toValue[NamedNode.xsd.dateTime] = function(lexicalForm) { return (new Date(lexicalForm)); };
Literal.toValue[NamedNode.xsd.decimal] = function(lexicalForm) { return (Number(lexicalForm)); };
Literal.toValue[NamedNode.xsd.double] = function(lexicalForm) { return (Number(lexicalForm)); };
Literal.toValue[NamedNode.xsd.integer] = function(lexicalForm) { return (Number(lexicalForm)); };
Literal.toValue[NamedNode.xsd.string] = function(lexicalForm) { return (lexicalForm); };

export function createLiteral(value, language, datatype) {
  if (language) {
    return (new LangString(value, language));
  } else if (datatype) {
    return (new Literal(value, language, datatype));
  } else {
    return (new SimpleString(value));
  }
}

export class SimpleString extends Literal {
  constructor(lexicalForm) {
    super(lexicalForm, null, NamedNode.xsd.string);
  }
  equals(other) {
    return ((other === this.lexicalForm) || super.equals(other));
  }
}             

export class LangString extends Literal {
  constructor(lexicalForm, language) {
    super(lexicalForm, language, NamedNode.rdf.langString);
  }
}


export class Patch {
  constructor(options) {
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
      default:
        return (null);
      }
    }
    this.put = whenGraph(options.put);
    this.post = whenGraph(options.post);
    this.delete = whenGraph(options.delete);
    this.contentType = options.contentType || 'application/n-quads';
  }

  encode(mediaType, continuation) {
    return (this.encode[mediaType](this, continuation));
  }

}

export function createPatch(options) {
  return (new Patch(options));
}

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
        content.encode(object.contentType, function(e) {
          if (e && e.length > 0) {
            body += separator + crlf;
            body += `X-Http-Method-Override: ${method}${crlf}`;
            body += `ContentType: ${object.contentType}${crlf}${crlf}`;
            body += e;
          }
        });
      }
    }
    appendSection(object.delete, "DELETE");
    appendSection(object.put, "PUT");
    appendSection(object.post, "POST");
    body += separator + " --" + crlf;
    return (continuation(body, {boundary: boundary}));
  };



export function decode(document, mediaType, continuation) {
  return (decode[mediaType](document, continuation));
}

decode['application/n-quads'] = function(document, continuation) {
  var parser = new nearley.Parser(nearley.Grammar.fromCompiled(nquadsGrammar.grammar));
  var result = parser.feed(document);
  return (continuation ? continuation(result) : result);
}

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


