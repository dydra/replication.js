// Copyright (c) 2019 datagraph gmbh

// a graph store implementation which combines
// - fetch network operators
// - rdflib codecs and data model
//const fetch = require('node-fetch');
//const $util = require('util');
//const $rdf = require('rdflib');
//const now = require('performance-now');

console.log(typeof importScripts);
console.log(("function" === typeof importScripts));
if ("function" === typeof importScripts) {
  importScripts('https://solid.github.io/releases/rdflib.js/rdflib-0.12.2.min.js');
}
console.log("past importscripts");
const now = Date.now;

/* alternative for wen sockets
var connection = null;
function logFetch(location, args) {
    console.log('fetchLog');
    console.log(location);
    console.log(args);
  if (!connection) {
    connection = new WebSocket(location);
  }
  return (new Promise(function(resolve, reject) {
    connection.send(args.body);
    resolve(location);
    return;
  }));
}
*/

function logFetch(location, args) {
  console.log('fetchLog');
  console.log(location);
  console.log(args);
  var headers = args.headers;
  for (var [k,v] of headers.entries()) {console.log([k,v])};
  return (fetch(location, args));
}

export class GSP {
}
window.GSP = GSP;
GSP.locationSuffix = "/service";
GSP.fetchOp = logFetch;

export class SPARQL {
}
SPARQL.locationSuffix = "/sparql";
SPARQL.fetchOp = logFetch;

// provide default encoding functions
String.prototype.encode = {
 'application/n-quads': function(object) { return( object ); },
 'text/turtle': function(object) { return( object ); },
 'application/n-quads': function(object) { return( object ); }
};



// define generic protocol interface
// graph store protocol

GSP.delete = function(location, options = {}, continuation) {
  var headers = new Headers({ "Accept": GSP.delete.acceptMediaType });
  if (options['authentication']) {
    headers.set("Authorization",
                'Basic ' + btoa(":" + options['authentication']));
  } else {
    headers.delete("Authorization");
  }
  var args = { method: "DELETE",
               cache: "no-cache",
               headers: headers };
  var constraint = options['graph'];
  location = location + GSP.locationSuffix;
  if (constraint) {
    location = location + '?graph=' + encodeURIComponent(constraint);
  }
  var p = GSP.fetchOp(location, args);
  return (continuation ? p.then(continuation) : p);
}
GSP.delete.acceptMediaType = 'text/turtle';

GSP.get = function(location, options = {}, continuation) {
  var headers = new Headers({ "Accept": (options["Accept"] || GSP.get.acceptMediaType) });
  if (options['authentication']) {
    headers.set("Authorization",
                'Basic ' + btoa(":" + options['authentication']));
  } else {
    headers.delete("Authorization");
  }
  var args = { method: "GET",
               cache: "no-cache",
               headers: headers };
  var constraintCount = 0;
  location = location + GSP.locationSuffix;
  ['subject', 'predicate', 'object', 'graph'].forEach(function(term) {
    var constraint = options[term];
    if (constraint) {
      location = location + ( (0 == constraintCount) ? '?' : '&') + term + '=';
      location = location + encodeURIComponent(constraint);
    }
  });
  var p = GSP.fetchOp(location, args);
  return (continuation ? p.then(continuation) : p);
}
GSP.get.acceptMediaType = 'application/n-quads';

GSP.head = function(location, options, continuation) {
  var headers = new Headers({});
  if (options['authentication']) {
    headers.set("Authorization",
                'Basic ' + btoa(":" + options['authentication']));
  } else {
    headers.delete("Authorization");
  }
  var args = { method: "HEAD",
               cache: "no-cache",
               headers: headers };
  location = location + GSP.locationSuffix;
  var p = GSP.fetchOp(location, args);
  return (continuation ? p.then(continuation) : p);
}

GSP.patch = function (location, content, options = {}, continuation) {
  var contentType = options["Content-Type"] || GSP.patch.contentMediaType;
  var headers = new Headers({ "Accept": (options["Accept"] || GSP.patch.acceptMediaType),
                              "Content-Type": contentType });
  var contentEncoded = ""
  var boundary = null;
  //console.log("GSP.patch");
  //console.log(options);
  if (options['authentication']) {
    headers.set("Authorization",'Basic ' + btoa(":" + options['authentication']));
  } else {
    headers.delete("Authorization");
  }
  //console.log(headers);
  //console.log(content);
  //console.log(contentType);
  content.encode(contentType, function(e, options ={}) {
    contentEncoded = e;
    boundary = options.boundary
  });
  if (boundary) {
    headers.set("Content-Type", headers.get("Content-Type") + `; boundary=${boundary}`);
  }
  var args = { method: "PATCH",
               headers: headers,
               body: contentEncoded };
  location = location + GSP.locationSuffix;
  var p = GSP.fetchOp(location, args);
  return (continuation ? p.then(continuation) : p);
}
GSP.patch.acceptMediaType = 'text/turtle';
GSP.patch.contentMediaType = 'multipart/related';

GSP.post = function (location, content, options = {}, continuation) {
  var contentType = options["Content-Type"] || GSP.post.contentMediaType;
  var headers = new Headers({ "Accept": (options["Accept"] || GSP.post.acceptMediaType),
                              "Content-Type": contentType });
  if (options['authentication']) {
    headers.set("Authorization",
                'Basic ' + btoa(":" + options['authentication']));
  } else {
    headers.delete("Authorization");
  }
  var contentEncoded = "";
  content.encode(contentType, function(e) { contentEncoded = e; });

  var args = { method: "POST",
               headers: headers,
               body: contentEncoded };
  location = location + GSP.locationSuffix;
  var p = GSP.fetchOp(location, args);
  return (continuation ? p.then(continuation) : p);
}
GSP.post.acceptMediaType = 'text/turtle';
GSP.post.contentMediaType = 'application/n-quads';

GSP.put = function (location, content, options = {}, continuation) {
  var contentType = options["Content-Type"] || GSP.put.contentMediaType;
  var headers = new Headers({ "Accept": (options["Accept"] || GSP.put.acceptMediaType),
                              "Content-Type": contentType });
  if (options['authentication']) {
    headers.set("Authorization",
                'Basic ' + btoa(":" + options['authentication']));
  } else {
    headers.delete("Authorization");
  }
  var contentEncoded = "";
  content.encode(contentType, function(e) { contentEncoded = e; });

  var args = { method: "PUT",
               headers: headers,
               body: contentEncoded };
  location = location + GSP.locationSuffix;
  var p = GSP.fetchOp(location, args);
  return (continuation ? p.then(continuation) : p);
}
GSP.put.AcceptType = 'text/turtle';
GSP.put.ContentType = 'application/n-quads';

// sparql protocol

SPARQL.get = function(location, query, options = {}, continuation) {
  var headers = new Headers({ "Accept": (options["Accept"] || SPARQL.get.acceptMediaType) });
  if (options['authentication']) {
    headers.set("Authorization",
                'Basic ' + btoa(":" + options['authentication']));
  } else {
    headers.delete("Authorization");
  }
  var args = { method: "GET",
               cache: "no-cache",
               headers: headers  };
  var queryArgument = (query ? ("query=" + encodeURIComponent(query)) : null);
  location = location + SPARQL.locationSuffix;
  if ( queryArgument ) {
    location += "?" + queryArgument;
  }
  var p = SPARQL.fetchOp(location, args);
  return (continuation ? p.then(continuation) : p);
}
SPARQL.get.contentMediaType = null;
SPARQL.get.acceptMediaType = 'application/sparql-results+json';

SPARQL.view = function(location, viewName, options = {}, continuation) {
  var headers = new Headers({ "Accept": (options["Accept"] || SPARQL.view.acceptMediaType)});
  if (options['authentication']) {
    headers.set("Authorization",
                'Basic ' + btoa(":" + options['authentication']));
  } else {
    headers.delete("Authorization");
  }
  var args = { method: "GET",
               cache: "no-cache",
               headers: headers  };
  var queryArgument = (query ? ("query=" + encodeURIComponent(query)) : null);
  location = location + "/" + viewName
  if ( queryArgument ) {
    location += "?" + queryArgument;
  }
  var p = SPARQL.fetchOp(location, args);
  return (continuation ? p.then(continuation) : p);
}
SPARQL.view.contentMediaType = null;
SPARQL.view.acceptMediaType = 'application/sparql-results+json';

SPARQL.post = function(location, query, options = {}, continuation) {
  var contentType = options["Content-Type"] || SPARQL.post.contentMediaType;
  var headers = new Headers({ "Accept": (options["Accept"] || SPARQL.post.acceptMediaType),
                              "Content-Type": contentType });
  var args = { method: "POST",
               cache: "no-cache",
               headers: headers,
               body: query };
  location = location + SPARQL.locationSuffix;
  var p = SPARQL.fetchOp(location, args);
  return (continuation ? p.then(continuation) : p);
}
SPARQL.post.acceptMediaType = 'text/turtle';
SPARQL.post.contentMediaType = 'application/sparql';

////////////////////////////////////////////////////////////////////////////////

/*parseRDF = function(document, continuation) {
  var graph = $rdf.graph();
  $rdf.parse(document, graph, undefined, 'application/n-quads',
    function(err, store) {
      var triples = store.statementsMatching(undefined, undefined, undefined);
      continuation(triples);
    });
  return ( graph );
}

import * as nquadsGrammar from './n-quads-grammar.js';

getResponse = function(url,continuation) {
  var store = $rdf.graph();
  $rdf.parse(document, store, url, 'application/n-quads',
    function(err, store) {
      var triples = store.statementsMatching(undefined, undefined, undefined);
      continuation(triples);
    });
  return ( store );

}
*/

function logTriples(e, graph) {
  console.log("logTriples");
  if ( e ) { console.log(e); };
  //console.log($util.inspect(graph.statements));
  console.log(graph.statements);
  return( graph );
}

function compareSPOG(s1, s2) {
 // console.log(s1.subject.compareTerm(s2.subject) + '.' +
//              s1.predicate.compareTerm(s2.predicate) + '.' +
//              s1.object.compareTerm(s2.object) + '.' +
//              s1.why.compareTerm(s2.why));

  return ( s1.subject.compareTerm(s2.subject) ||
           s1.predicate.compareTerm(s2.predicate) ||
           s1.object.compareTerm(s2.object) ||
           s1.why.compareTerm(s2.why) );
}


/*


//var quads = getGSP('http://public.dydra.com/james/foaf/service');
var quads = getGSP('http://public.dydra.com/james/testload/service');
//console.log('quads');
//console.log(quads);

quads.then(function(response) { parseResponse(response.body, testDifference); });

function testDifference(quads) {
  console.log('testDifference');
  console.log(quads.length);
  var oldstmts = quads.slice(100);
  var newstmts = quads.slice(0,-100);
//  console.log(oldstmts);
//  console.log(newstmts);
  var oldGraph = graph(oldstmts);
  var newGraph = graph(newstmts);
  console.log('graphs');
  //console.log($util.inspect(oldGraph));
  //console.log($util.inspect(newGraph));

  var time1 = now();
  result = oldGraph.difference(newGraph);
  var time2 = now();
  // console.log( $util.inspect(result) );
  console.log( 'diffd' );
 // console.log($rdf.Serializer(newGraph).statementsToNTriples(result['added']));
 // console.log($rdf.Serializer(newGraph).statementsToNTriples(result['removed']));
  console.log('time: ' + (time2 - time1));
}

var oldGraph = $rdf.graph();
var newGraph = $rdf.graph();
var oldDocument = "<http://example.org/subject> <http://example.org/predicate1> \"object1\" <http://graph>.\
<http://example.org/subject> <http://example.org/predicate2> \"object2\" .";
var newDocument = '<http://example.org/subject> <http://example.org/predicate1> "object1" <http://graph> .\
<http://example.org/subject> <http://example.org/predicate3> "object3" .';
$rdf.parse(oldDocument, oldGraph, undefined, 'application/n-quads',
           function() {
             console.log('parsed old');
             $rdf.parse(newDocument, newGraph, undefined, 'application/n-quads',
                        function() {
                          console.log('parsed new');
                          result = oldGraph.difference(newGraph);
                         // console.log( $util.inspect(result) );
                          console.log( 'diffd' );
                         // console.log($rdf.Serializer(newGraph).statementsToNTriples(result['added']));
                         // console.log($rdf.Serializer(newGraph).statementsToNTriples(result['removed']));
                          var time2 = now();
                          console.log('time: ' + (time2 - time1));
                         }) });
//console.log(getSPARQL);

//getResponse('http://dydra.com/james/test2/sparql', logTriples);
//console.log('+++++++++++');
result = getSPARQL('http://dydra.com/james/test2/sparql',
                   function(response){
                     //console.log('response: ' + $util.inspect(response, {showHidden: true}));
                     console.log('response: ');
                     console.log('response);
                     console.log('status: ' + response.status);
                     //console.log('headers: ' + $util.inspect(response.headers, {showHidden: true}));
                     console.log('headers:);
                     console.log(response.headers);
                     response.text().then(function(text) {parseResponse(text, logTriples);})
                     console.log('-----------');
                     getResponse(response.url, logTriples);
                   },
                   'construct {?s ?p ?o} where {?s ?p ?o}');

// console.log(result);
*/
console.log('graph-store: loaded');

