// Copyright (c) 2019 datagraph gmbh

/*
The class RDFDatabase extends GraphDatabase to implement communication
via RDF Graph Store and SPARQL protocols.
*/

import {GraphDatabase} from './graph-database.js';
import {GSP, SPARQL} from './rdf-graph-store.js';
import * as RDFEnvironment from './rdf-environment.js';

console.log('rdf-database.js: start');
console.log(GraphDatabase);

export class RDFDatabase extends GraphDatabase {
  constructor(name, location, authentication, options = {}) {
    super(name, location, authentication, options);
  }

  head(options, continuation) {
    console.log("inhead");
    options = Object.assign({}, options, {authentication: this.authentication});
    var p = GSP.head(this.location, options, continuation);
    return (p);
  }

  patch(content, options, continuation) {
    options = Object.assign({}, options, {authentication: this.authentication});
    console.log('RDFDatabase.patch');
    console.log(options);
    var p = GSP.patch(this.location,
                      this.environment.createPatch(content),
                      options,
                      continuation);
    return (p);
  }
  get(options, continuation) {
    options = Object.assign({}, options, {authentication: this.authentication});
    return (GSP.get(this.location, options,
                    continuation));
  }
  describe(keyObject, options, continuation) {
    options = Object.assign({}, options, {authentication: this.authentication});
    var where = key.entries.map(function([key, value]) {
      var predicate = this.environment.createNamedNode(key);
      return (`?s ${predicate} ${value}`);
    }).join(' . ');
    var query = `describe ?s where { ${where} }`;
    return (SPARQL.get(this.location, query, options, continuation));
  }
}

// console.log('rdf-database.js: loaded');