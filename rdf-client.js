// Copyright (c) 2019 datagraph gmbh

// prefetch everything of interest

// /javascripts/vendor/nearley/lib/nearley.js
//import * as rdfjs from '/javascripts/vendor/rdfjs/data-model/dist/rdf-data-model.js';
//export {rdfjs};
//import * as URI from '/javascripts/vendor/uri-js/dist/es5/uri.all.min.js';
import * as nearley from '/javascripts/vendor/nearley/lib/nearley.js';
import * as nquadsGrammar from './n-quads-grammar.js';
import {GraphEnvironment} from './graph-environment.js';
export {GraphEnvironment};
import * as rdfEnvironment from './rdf-environment.js';
export {rdfEnvironment}
import * as graphObject from './graph-object.js';
export {graphObject};
import * as graphDatabase from './graph-database.js';
export {graphDatabase};
import * as rdfDatabase from './rdf-database.js';
export {rdfDatabase};
import {GSP, SPARQL} from './rdf-graph-store.js';
export {GSP, SPARQL};
import * as $uuid from '/javascripts/vendor/uuid-v1.js'
