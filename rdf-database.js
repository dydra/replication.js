// Copyright (c) 2019 datagraph gmbh

/**
 @overview
The class RDFDatabase extends GraphDatabase to implement communication
via RDF Graph Store and SPARQL protocols.
*/

import {GraphDatabase} from './graph-database.js';
import {GSP, SPARQL} from './rdf-graph-store.js';
import * as RDFEnvironment from './rdf-environment.js';

// console.log('rdf-database.js: start');
// console.log(GraphDatabase);

/**
 @extends GraphDatabase
 */
export class RDFDatabase extends GraphDatabase {
  constructor(name, location, authentication, options = {}) {
    super(name, location, authentication, options);
  }

  head(options, continuation) {
    // console.log("RDFDatabase.head");
    options = Object.assign({}, options, {authentication: this.authentication});
    var p = GSP.head(this.location, options, continuation);
    return (p);
  }

  patch(content, options, continuation) {
    console.log("RDFDatabase.patch", content, options);
    super.patch(content, options, null);
    options = Object.assign({}, options, {authentication: this.authentication,
                                          contentDisposition: `replicate=${this.name.replace(/ /g,'')}`});
    var p = GSP.patch(this.location,
                      this.environment.createPatch(content),
                      options,
                      continuation);
    return (p);
  }
  get(options, continuation) {
    console.log("RDFDatabase.get");
    var decodeGetContent = function(response) {
      // yields a graph or a patch depending on arriving media type
      var content = this.environment.decode(response.headers.get('Content-Type'), response.body);
      return (continuation(content));
    };
    options = Object.assign({}, options, {authentication: this.authentication});
    return (GSP.get(this.location, options,
                    decodeGetContent));
  }
  describe(keyObject, options, continuation) {
    console.log("RDFDatabase.describe");
    console.log(keyObject);
    var thisDatabase = this;
    options = Object.assign({}, options, {authentication: thisDatabase.authentication});
    var properties = keyObject.persistentProperties();
    var where = Object.getOwnPropertyNames(keyObject).map(function(key) {
      if (properties.indexOf(key) >= 0) {
        var value = keyObject[key];
        if (value) {
          var predicate = thisDatabase.environment.createNamedNode(key);
          console.log('predicate ' + key + ' : ' + predicate)
          return (`?s <${predicate.lexicalForm}> "${value}" .`);
        } else {
          return ("");
        }
      } else {
       return ("");
      }
    }).join(' ');
    var query = `describe ?s where { ${where} }`;
    return (SPARQL.get(thisDatabase.location, query, options, continuation));
  }
}

// console.log('rdf-database.js: loaded');