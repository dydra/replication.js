// Copyright (c) 2019 datagraph gmbh

/**
 @overview
The class RDFDatabase extends GraphDatabase to implement communication
via RDF Graph Store and SPARQL protocols.
*/

import {GraphDatabase} from './graph-database.js';
import {GSP, SPARQL} from './rdf-graph-store.js';
import * as RDFEnvironment from './rdf-environment.js';
import { getResource, headResource, postResource, putResource, deleteResource,
         authentication_prompt, authentication_set } from './resource-access.js';

// console.log('rdf-database.js: start');
// console.log(GraphDatabase);

/**
 @extends GraphDatabase
 */
export class RDFDatabase extends GraphDatabase {
  /**
   @param {string} name
   @param {string} location - The connection url namestring
   @param {string} authentication - The authentication string
   @param {Object} [options]
   */
  constructor(name, location, authentication, options = {}) {
    super(name, location, authentication, options);
  }

  /**
   Perform a GSP head request.
   Return the promise or its then result depending on the given continuation.
   @param {Object} options - The request headers
   @param {(function|null)} [continuation]
   */ 
  head(options, continuation = null) {
    // console.log("RDFDatabase.head");
    options = Object.assign({}, options, {authentication: this.authentication});
    var p = GSP.head(this.location, options, continuation);
    return (p);
  }

  /**
   Perform a GSP patch request.
   Return the promise or its then result depending on the given continuation.
   The given patch is encoded as a patch document and sent as the request body.
   @param {Patch} patch - the patch content
   @param {Object} options - The request headers
   @param {(function|null)} [continuation]
   */
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

  /**
   Perform a GSP get request.
   Decode the response content as per its content type.
   Return the continuation result, if supplied or the decoded cotent itself.
   @param {Object} options - The request headers
   @param {(function|null)} [continuation]
   @todo Allow an option to override the response content.
   */
  get(options, continuation) {
    console.log("RDFDatabase.get");
    options = Object.assign({}, options,
                    {"Accept": 'application/n-quads',
                     environment: this.environment,
                     authentication: this.authentication});
    getResource(this.location, options, continuation);
  }

  /**
   Perform a SPARQL get on a describe query minted to reflect the state of the given key object.
   @param {Object} keyObject
   @param {Object} options
   @param {(function|null)} [continuation]
   */
  describe(keyObject, options, continuation) {
    console.log("RDFDatabase.describe");
    console.log(keyObject);
    options = Object.assign({}, options,
                    {"Accept": 'application/n-quads',
                     environment: this.environment,
                     authentication: this.authentication});
    var thisDatabase = this;
    var properties = keyObject.persistentProperties();
    var where = Object.getOwnPropertyNames(keyObject).map(function(key) {
      if (properties.indexOf(key) >= 0) {
        var value = keyObject[key];
        if (value) {
          var predicate = thisDatabase.environment.createNamedNode(key);
          // console.log('predicate ' + key + ' : ' + predicate)
          return (`?s <${predicate.lexicalForm}> "${value}" .`);
        } else {
          return ("");
        }
      } else {
       return ("");
      }
    }).join(' ');
    var query = `describe ?s where { ${where} }`;
    postResource(thisDatabase.location, query, options, continuation );
  }
}

// console.log('rdf-database.js: loaded');