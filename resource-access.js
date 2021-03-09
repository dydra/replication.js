// .js definitions for resource access operators
//
// they are arranged by application layer protocol and method
//
// headResource
// deleteResource
// getResource
// postResource
// putResource

// the implementation dispatches initially through the base operators based just on the accept media type.
// where the content type matters, the base operator look for a two-dimensional specialization.
// if the result for the accept type key is an object, it serves for a second level dispatch.
// a "*" media type provides a default at the second level.
// when the result for the accept is a function the base operator calls that directly.

// present interaction operations, simplified as getResource and postResource.
// implement them in terms application level protocol components - HTTP or higher, such as SPARQL pr GraphQL
// and eventuall MQTT and WebSockets.
// present the operations in terms of the interaction goals and content types, rather than protocol
// 
// that could be inverted, but there is value in having this api abstract over media type.
//


import { GSP, SESAME, HTTP, SPARQL } from '/javascripts/replication/rdf-graph-store.js';
import { ulog } from '/javascripts/ulog/ulog-master/ulog.umd.js';
import { default as GQLRequest} from '/javascripts/vendor/graphql-request/src/index.js';
import { RDFEnvironment, mediaTypeStem } from '/javascripts/replication/rdf-environment.js';

export const log = ulog("resource-access");
log.level = log.DEBUG;


/**
 GET:
 Retrieve and decode the resource according to media types.
 Initiate the request based on the Accept type, but decode based on the actual response Content-Type.

 @param {string} location - the resource location
 @param {Object} options
 @param {string} options.Accept, - the accept media type
 @param {function} [continuation] - if present, the result disposition. if absent, create and return a Promise
 @param {function} [fail] - if present, the error disposition. if absent, use console.log.

 see: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
 */

// excel : would be https://github.com/SheetJS/sheetjs
// this needs to be two-dimensional

export function getResource (location, options, continuation, fail) {
  log.debug("getResource: ", location, options);
  log.debug("getResource: ", getResource);
  var mediaType = options['Accept'];
  if (! mediaType) {
    console.trace();
    throw (new Error("getResource: Accept option is required."));
  }
  var match = mediaTypeStem(mediaType);
  if (match) {
    var implementation = getResource[match];
    if (implementation) {
      // invoke the implementation. specify the static class context and pass the given arguments
      if (continuation) {
        return (implementation(location, options, continuation, fail || log.warn));
      } else {
        return (new Promise(function(accept, reject) {
                  implementation(location, options, accept, reject || fail || log.warn) })
                );
      }
    } else {
      console.trace();
      throw (new Error(`getResource: unimplemented media type: '${mediaType}'`));
    }
  } else {
    console.trace();
    throw (new Error(`getResource: unrecognized media type: '${mediaType}'`));
  }
}

/**
 DELETE:
 NYI
 */

export function deleteResource (location, options, continuation, fail = log.warn) {
 fail(null);
}




/**
 HEAD:
 Probe the resource and return the  response for an ok status code
 */

export function headResource (location, options, continuation, fail = log.warn) {
 HTTP.head(location, options,
           function(response) {
             log.debug("HTTP.headResource: response: ", response);
             if (response.ok) {
               continuation(response);
             } else {
               fail(response);
             }
           });
}


/**
 POST:
 Transfer content to the resource according to content media type.
 Decode the response based on the actual response Content-Type.

 @param {Object} location - the resource location
 @param {string | Object} [expression] - content to accompany the request for the resource
 @param {Object} options
 @param {string} options.Accept, - the accept media type
 @param {string} options.'Content-Type', - the content media type

 see: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
 */

export function postResource (location, content, options, continuation, fail) {
  log.debug("postResource: ", location, content, options);
  function invokeImplementation(implementation) {
    // invoke the implementation. specify the static class context and pass the given arguments
    if (continuation) {
      log.debug("postResource: with continuation");
      return (implementation(location, content, options, continuation, fail || log.warn));
    } else {
      log.debug("postResource: as promise");
      return (new Promise(function(accept, reject) {
               log.debug("postResource: promise invoked: ", accept, reject);
               implementation(location, content, options, accept, reject || fail || log.warn) })
             );
    }
  }
  var acceptType = options['Accept'];
  if (! acceptType) {
    console.trace();
    throw (new Error("postResource: Accept option is required."));
  }
  var acceptMatch = mediaTypeStem(acceptType);
  if (acceptMatch) {
    let implementation = postResource[acceptMatch];
    switch(typeof(implementation)) {
    case "function":
      return (invokeImplementation(implementation));
    case "object":
      var contentType = options['Content-Type'];
      var contentMatch = (contentType ? mediaTypeStem(contentType) : "*");
      if (contentMatch) {
        implementation = implementation[contentMatch] || implementation["*"];
        switch(typeof(implementation)) {
        case "function":
          return (invokeImplementation(implementation));
        default:
          console.trace();
          throw (new Error(`postResource: unimplemented media type combination: '${acceptType}'.'${contentType}'`));
        }
      } else {
        console.trace();
        throw (new Error(`postResource: unrecognized media type: '${contentType}'`));
      }
    default:
      console.trace();
      throw (new Error(`postResource: unrecognized media type implementation: '${acceptType}': ${implementation}`));
    }
  } else {
    console.trace();
    throw (new Error(`postResource: unrecognized media type: '${acceptType}'`));
  }
}


/**
 PUT:
 Transfer content to the resource according to content media type.
 Decode the response based on the actual response Content-Type.

 @param {Object} location - the resource location
 @param {string | Object} [expression] - content to accompany the request for the resource
 @param {Object} options
 @param {string} options.Accept, - the accept media type
 @param {string} options.'Content-Type', - the content media type

 see: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
 */

export function putResource (location, content, options, continuation, fail) {
  log.debug("putResource: ", location, content, options);
  var mediaType = options['Accept'];
  if (! mediaType) {
    console.trace();
    throw (new Error("putResource: Accept option is required."));
  }
  var match = mediaTypeStem(mediaType);
  if (match) {
    var implementation = putResource[match];
    if (implementation) {
      // invoke the implementation. specify the static class context and pass the given arguments
      if (continuation) {
        log.debug("putResource: with continuation");
        return (implementation(location, content, options, continuation, fail || log.warn));
      } else {
        log.debug("putResource: as promise");
        return (new Promise(function(accept, reject) {
                 implementation(location, content, options, accept, reject || fail || log.warn) })
               );
      }
    } else {
      console.trace();
      throw (new Error(`putResource: unimplemented media type: '${mediaType}'`));
    }
  } else {
    console.trace();
    throw (new Error(`putResource: unrecognized media type: '${mediaType}'`));
  }  

}

/**
 Arrange to handle the outcome of an HTTP-based request, made the fetch API.
 Interpret the response state to retry authentication failures and accept any
 success code to cause the response to flow to the success continuation.
 401 requests authentication information interactively, augments the given options
 with new authentication information and invokes the retry continuation.
 Any other condition invokes the fail continuation if one is provided.
 */


export function responseHandler (location, options, succeed, retry, fail) {
  var savedAuth = responseHandler.getAuthentication(location);
  var optionsAuth = options.authentication;
  if (savedAuth && !optionsAuth) {
    Object.assign(options, {authentication: savedAuth});
  }
  function ensureSuccessfulResponse (response) {
    log.debug("ensureSuccessfulResponse: ", response);
    if (response instanceof Response) {
      if (response.ok) {
        log.debug(response.status, location);
        succeed(response);
      } else if (response.status == 401) {
        log.warn("responseHandler: 401: ", location);
        function localRetry(authentication) {
          responseHandler.setAuthentication(location, authentication);
          options = Object.assign({}, options, {authentication: authentication});
          log.debug("esr: augmented options: ", options);
          retry(options);
        }
        log.debug("prompt: ", localRetry);
        authentication_token_prompt({location: location, submit: localRetry});
      } else {
        // a failed response aborts references to the text body
        log.debug(`responseHandler ${location}: ${response.status}`);
        if (fail) { fail(response); }
      }
    } else {
      if (fail) { fail(response); }
    }
  }
  return ( ensureSuccessfulResponse );
}
responseHandler.map = new Map();
responseHandler.getAuthentication = function(location) {
  var hostname = new URL(location, document.URL).host;
  var auth = this.map.get(hostname);
  // console.log('responseHandler.getAuthentication: ', location, hostname, auth);
  return( auth );
}
responseHandler.setAuthentication = function(location, authentication) {
  if (typeof(authentication) == 'string') {
    var hostname = new URL(location, document.URL).host;
    this.map.set(hostname, authentication) ;
    //  console.log('responseHandler.setAuthentication: ', location, hostname, authentication);
    return (true);
  } else {
    throw (new Error(`setAuthentication: invalid authentication value: ${authentication}`));
  }
}


function promiseHandler (location, options, succeed, retry, fail = log.warn) {
  var savedAuth = responseHandler.getAuthentication(location);
  var optionsAuth = options.authentication;
  if (savedAuth && !optionsAuth) {
    Object.assign(options, {authentication: savedAuth});
  }
  function retryUntilSuccessful (promise) {
    log.debug("retryUntilSuccessful: ", promise);
    function accepted(response) {
      if (response instanceof Response) {
        if (response.ok) {
          log.debug(response.status, location);
          succeed(response);
        } else if (response.status == 401) {
          log.warn("401: ", location);
          function localRetry(authentication) {
            responseHandler.setAuthentication(location, authentication);
            options = Object.assign({}, options, {authentication: authentication});
            log.debug("esr: augmented options: ", options);
            retry(options);
          }
          log.debug("prompt: ", localRetry);
          authentication_token_prompt({location: location, submit: localRetry});
        } else {
          // a failed response aborts references to the text body
          log.warn(`promiseHandler ${location}: failed ${response.status}`);
          fail(response);
        }
      } else {
        log.warn(`promiseHandler ${location}: not a response ${response}`);
        fail(response);
      }
    }
    function rejected(condition) {
      log.warn(`promiseHandler ${location}: rejected ${condition}`);
      fail(condition);
    }
    promise.then(accepted).catch(rejected);
  }
  return ( retryUntilSuccessful );
}



/**
 Given the intent to accept 'application/json' for a get, treat it as a
 simple http GET
 */

getResource['application/json'] = function(location, options, continuation, fail) {
  log.debug("getResource['application/json']: ", location, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    log.trace("getResource: response: ", response, contentType);
    response.json().then(function(json) {
      log.trace("json:", json);
      // don't annotate the json
      continuation(json);
    });
  }
  function retry(newOptions) {
    getResource['application/json'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(HTTP.get(location, options));
}

/**
 getResource['application/n-quads']
 needs to distinguish from GSP requests, which can constrain the result with spog arguments
 v/s straight sesame-like requests. the latter also covers the interaction model of SPARQL
 queries, whether in-line or as views.
 */
getResource['application/n-quads'] = function(location, options, continuation, fail) {
  log.debug("getResource: ", options);
  function succeed(response) {
    log.debug("getResource['application/n-quads']: response: ", response);
    var contentType = response.headers.get('Content-Type');
    var environment = options.environment || RDFEnvironment.theEnvironment;
    function acceptText(document) {
      log.debug("document:", document);
      var graph = environment.decode(document, contentType);
      if (graph) {
        log.debug("getResource: graph:", graph);
        graph.location = location;
        continuation(graph);
      } else {
        log.warn("getResource: failed to decode", document);
        fail(document);
      }
    }
    log.trace("getResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    getResource['application/n-quads'](location, newOptions, continuation, fail);
  }
  if (['graph', 'subject', 'predicate', 'object'].find(function(role) { return(!(options[role] == undefined)); })) {
    promiseHandler(location, options, succeed, retry, fail)(GSP.get(location, options));
  } else {
    promiseHandler(location, options, succeed, retry, fail)(SESAME.get(location, options));
  }
};
getResource['application/n-triples'] = function(location, options, continuation) {
  return (getResource['application/n-quads'](location, options, continuation));
}


getResource['application/octet-stream'] = function(location, options, continuation, fail) {
  log.debug("getResource: ", location, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    log.trace("getResource: response: ", response, contentType);
    response.blob().then(continuation);
  }
  function retry(newOptions) {
    getResource['application/octet-stream'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(HTTP.get(location, options));
}
// var ss = null;
// getResource("https://nl4.dydra.com/data/Value_Expectations.xlsx", {"Accept": 'application/octet-stream', acceptBody: log.debug}, function(blob) { blob.arrayBuffer().then(function(buffer) {ss= XLSX.read(buffer, {type:"buffer"})})})

getResource['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] = function(location, options, continuation) {
  function succeed(blob) {
    function acceptBuffer(buffer) {
      var bodyContinuation = options.acceptBody;
      if (bodyContinuation) { bodyContinuation(buffer); }
      var sheet = XLSX.read(buffer, {type:"buffer"});
      sheet.mediaType = mediaTypeStem(contentType);
      sheet.location = location;
      continuation(sheet);
    }
    blob.arrayBuffer().then(acceptBuffer);
  }
  getResource['application/octet-stream'](location, options, succeed);
}


getResource['text/csv'] = function(location, options, continuation, fail) {
  log.debug("getResource: ", location, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptBody(document) {
      log.trace("document:", document);
      var bodyContinuation = options.acceptBody;
      if (bodyContinuation) { bodyContinuation(document); }  // even if it may be invalid
      var csv = CSV.parse(document);
      log.trace("getResource: csv:", csv);
      csv.mediaType = mediaTypeStem(contentType);
      csv.location = location;
      continuation(csv);
    }
    log.trace("getResource: response: ", response, contentType);
    response.text().then(acceptBody);
  }
  function retry(newOptions) {
    getResource['text/csv'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(HTTP.get(location, options));
}


getResource['text/html'] = function(location, options, continuation, fail) {
  log.debug("getResource: ", location, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptText(document) {
      log.trace("document:", document);
      var html = new DOMParser().parseFromString(document, contentType);
      log.trace("getResource: html:", html);
      html.mediaType = mediaTypeStem(contentType);
      // not permitted : html.location = location;
      continuation(html);
    }
    log.trace("getResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    getResource['text/html'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(HTTP.get(location, options));
}
// getResource('https://nl4.dydra.com/data/', {"Accept": "text/html"}, log.debug);


getResource['text/plain'] = function(location, options, continuation, fail) {
  log.debug("getResource: ", location, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    log.trace("getResource: response: ", response, contentType);
    response.text().then(continuation);
  }
  function retry(newOptions) {
    getResource['text/plain'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(HTTP.get(location, options));
}


getResource['application/sparql-results+json'] = function(location, options, continuation, fail) {
  log.debug("getResource: ", location, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptJSON(json) {
      // log.debug("json:", json);
      json.mediaType = mediaTypeStem(contentType);
      json.location = location;
      continuation(json);
    }
    log.trace("getResource: response: ", response, contentType);
    response.json().then(acceptJSON);
  }
  function retry(newOptions) {
    getResource['application/sparql-results+json'](location, newOptions, continuation, fail);
  }
  var query = options['Query'];
  if (query) {
    // if a query is present, it is a sparql request
    promiseHandler(location, options, succeed, retry, fail)(SPARQL.get(location, query, options));
  } else {
    // otherwise, treat it as a rest request via SESAME 
    promiseHandler(location, options, succeed, retry, fail)(SESAME.get(location, options));
  }
}

getResource['application/sparql-query'] = function(location, options, continuation, fail) {
  log.debug("getResource: ", location, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptText(sparql) {
      log.debug("getResource: sparql: ", sparql);
      continuation(sparql);
    }
    log.trace("getResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    getResource['application/sparql-query'](location, newOptions, continuation, fail);
  }
  // promiseHandler(location, options, succeed, retry, fail)(SESAME.get(location, options));
  var query = options['Query'] || options['query'];
  if (query) {
    // if a query is present, it is a sparql request
    promiseHandler(location, options, succeed, retry, fail)(SPARQL.get(location, query, options));
  } else {
    // otherwise, treat it as a rest request via SESAME 
    promiseHandler(location, options, succeed, retry, fail)(SESAME.get(location, options));
  }

}

/**
 Request the query expression variants for a view - as json
 */
getResource['application/sparql-query+json'] = function(location, options, continuation, fail) {
  // log.debug("getResource: ", location, query, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptJSON(json) {
      log.debug("json:", json);
      json.mediaType = mediaTypeStem(contentType);
      json.location = location;
      continuation(json);
    }
    log.debug("getResource: response: ", response, contentType);
    response.json().then(acceptJSON);
  }
  function retry(newOptions) {
    getResource['application/sparql-query+json'](location, newOptions, continuation, fail);
  }
  // promiseHandler(location, options, succeed, retry, fail)(SESAME.get(location, options));
  var query = options['Query'] || options['query'];
  if (query) {
    // if a query is present, it is a sparql request
    promiseHandler(location, options, succeed, retry, fail)(SPARQL.get(location, query, options));
  } else {
    // otherwise, treat it as a rest request via SESAME 
    promiseHandler(location, options, succeed, retry, fail)(SESAME.get(location, options));
  }
}

/**
 Request the query expression variants for a view - as abstract algebra
 */
getResource['application/sparql-query-algebra'] = function(location, options, continuation, fail) {
  // log.debug("getResource: ", location, query, options);
  function succeed(response) {
    log.debug("getResource.succeed:", response);
    var contentType = response.headers.get('Content-Type');
    function acceptText(text) {
      log.debug("getResource.text:", text);
      continuation(text);
    }
    log.debug("getResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    getResource['application/sparql-query-algebra'](location, newOptions, continuation, fail);
  }
  // promiseHandler(location, options, succeed, retry, fail)(SESAME.get(location, options));
  var query = options['Query'] || options['query'];
  if (query) {
    // if a query is present, it is a sparql request
    promiseHandler(location, options, succeed, retry, fail)(SPARQL.get(location, query, options));
  } else {
    // otherwise, treat it as a rest request via SESAME 
    promiseHandler(location, options, succeed, retry, fail)(SESAME.get(location, options));
  }
}


getResource['application/sparql-query+olog+svg+xml'] = function(location, options, continuation, fail) {
  log.debug("getResource: ", location, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptText(svg) {
      log.debug("getResource: text: ", svg);
      continuation(svg);
    }
    log.trace("getResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    getResource['application/sparql-query+olog+svg+xml'](location, newOptions, continuation, fail);
  }
  var query = options['Query'] || options['query'];
  if (query) {
    // if a query is present, it is a sparql request
    promiseHandler(location, options, succeed, retry, fail)(SPARQL.get(location, query, options));
  } else {
    console.trace();
    throw (new Error("query is required:"));
  }
}

getResource['image/vnd.dydra.sparql-results+circos+svg+xml'] = function(location, options, continuation, fail) {
  log.debug("getResource: ", location, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptText(xml) {
      log.debug("getResource: sparql: ", xml);
      continuation(xml);
    }
    log.trace("getResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    getResource['image/vnd.dydra.sparql-results+circos+svg+xml'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(SESAME.get(location, options));
}


getResource['image/vnd.dydra.sparql-results+graphviz+svg+xml'] = function(location, options, continuation, fail) {
  log.debug("getResource: ", location, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptText(xml) {
      log.debug("getResource: sparql: ", xml);
      continuation(xml);
    }
    log.trace("getResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    getResource['image/vnd.dydra.sparql-results+graphviz+svg+xml'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(SESAME.get(location, options));
}




/**
 Request a query with the expection that it be reflected back
 */
postResource['application/sparql-query'] = function(location, query, options, continuation, fail) {
  log.debug("postResource: ", location, query, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptText(text) {
      log.debug("text:", text);
      continuation(text);
    }
    // log.debug("postResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    postResource['application/sparql-query'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(SPARQL.post(location, query, options));
}

/**
 Request a query with the expectation that it be reflected back - as json
 */
postResource['application/sparql-query+json'] = function(location, query, options, continuation, fail) {
  // log.debug("postResource: ", location, query, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptJSON(json) {
      log.debug("json:", json);
      json.mediaType = mediaTypeStem(contentType);
      json.location = location;
      continuation(json);
    }
    log.debug("postResource: response: ", response, contentType);
    response.json().then(acceptJSON);
  }
  function retry(newOptions) {
    postResource['application/sparql-query+json'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(SPARQL.post(location, query, options));
}

/**
 Request a query with the expectation that it be reflected back - as query algebra
 */
postResource['application/sparql-query-algebra'] = function(location, query, options, continuation, fail) {
  // log.debug("postResource: ", location, query, options);
  function succeed(response) {
    log.debug("postResource.succeed:", response);
    var contentType = response.headers.get('Content-Type');
    function acceptText(text) {
      log.debug("postResource.text:", text);
      continuation(text);
    }
    log.debug("postResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    postResource['application/sparql-query-algebra'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(SPARQL.post(location, query, options));
}

/**
 Request a query with the expectation that it be reflected back - as an execution plan text
 */
postResource['application/sparql-query-execution'] = function(location, query, options, continuation, fail) {
  // log.debug("postResource: ", location, query, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptText(text) {
      log.debug("text:", text);
      continuation(text);
    }
    log.debug("postResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    postResource['application/sparql-query-execution'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(SPARQL.post(location, query, options));
}

/**
 Request a query with the expectation that it be reflected back - as query plan
 */
postResource['application/sparql-query-plan'] = function(location, query, options, continuation, fail) {
  // log.debug("postResource: ", location, query, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptText(text) {
      log.debug("text:", text);
      continuation(text);
    }
    log.debug("postResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    postResource['application/sparql-query-plan'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(SPARQL.post(location, query, options));
}

postResource['application/sparql-results+json'] = function(location, query, options, continuation, fail) {
  // log.debug("postResource: ", location, query, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptJSON(json) {
      log.debug("json:", json);
      json.mediaType = mediaTypeStem(contentType);
      json.location = location;
      continuation(json);
    }
    // log.debug("postResource: response: ", response, contentType);
    response.json().then(acceptJSON);
  }
  function retry(newOptions) {
    postResource['application/sparql-results+json'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(SPARQL.post(location, query, options));
}

/**
 A POST request for application/json needs to distinguish the request based on content type
 The simple form of that api allows no error reccovery.
 */

postResource['application/json'] = {};
postResource['application/json']['application/sparql-query'] = function(location, query, options, continuation, fail) {
  log.debug("postResource: application/json ", location, query, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptJSON(json) {
      log.debug("json:", json);
      json.mediaType = mediaTypeStem(contentType);
      json.location = location;
      continuation(json);
    }
    log.debug("postResource: response: ", response, contentType);
    response.json().then(acceptJSON);
  }
  function retry(newOptions) {
    postResource['application/json'](location, newOptions, continuation, fail);
  }
  log.debug("postResource: a/j: sparql.post")
  promiseHandler(location, options, succeed, retry, fail)(SPARQL.post(location, query, options));
}
postResource['application/json']['application/sparql-update'] =
  postResource['application/json']['application/sparql-query']

postResource['application/json']['application/graphql'] = function(location, query, options, continuation, fail) {
  log.debug("postResource: a/j ", location, query, options);
  // the signature is url, query variables
  GQLRequest(location, query, {})
    .then(function (json) {
      // log.debug("json:", json);
      // not available there: json.mediaType = mediaTypeStem(contentType);
      json.location = location;
      continuation(json);
    });
}


// var query = '{ Movie(title: "Inception") { releaseDate actors { name } } }'
// postResource('https://api.graph.cool/simple/v1/movies', query, {"Accept": 'application/json'}, log.debug);

/**
 postResource['application/n-quads']
 this can be either a GSP import or a SPARQL query.
 */
postResource['application/n-quads'] = {};

/**
 postResource with sparql content is executed as a SPARQL query.
 */
postResource['application/n-quads']['application/sparql-query'] = function(location, content, options, continuation, fail) {
  log.debug("postResource['application/n-quads']['application/sparql-query']: ", options);
  function succeed(response) {
    log.debug("postResource['application/n-quads']: response: ", response);
    var contentType = response.headers.get('Content-Type');
    function acceptText(document) {
      log.trace("document:", document);
      var graph;
      if (document) {
        graph = RDFEnvironment.theEnvironment.decode(document, contentType);
      } else {
        graph = RDFEnvironment.theEnvironment.createGraph([]);
      }
      log.trace("postResource: graph:", graph);
      graph.location = location;
      graph.contentType = mediaTypeStem(contentType);
      continuation(graph);
    }
    log.trace("postResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    postResource['application/n-quads'](location, content, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(SPARQL.post(location, content, options));
};

/**
 postResource with non-sparql content executed as a graph store request toimport rdf content
 */
postResource['application/n-quads']['*'] = function(location, content, options, continuation, fail) {
  log.debug("postResource['application/n-quads']['*']: ", options);
  function succeed(response) {
    log.debug("postResource['application/n-quads']: response: ", response);
    var contentType = response.headers.get('Content-Type');
    function acceptText(document) {
      log.trace("document:", document);
      var graph;
      if (document) {
        graph = RDFEnvironment.theEnvironment.decode(document, contentType);
      } else {
        graph = RDFEnvironment.theEnvironment.createGraph([]);
      }
      log.trace("postResource: graph:", graph);
      graph.location = location;
      graph.contentType = mediaTypeStem(contentType);
      continuation(graph);
    }
    log.trace("postResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    postResource['application/n-quads'](location, content, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(GSP.post(location, content, options));
};

postResource['application/n-triples'] = postResource['application/n-quads'];


/**
 putResource['application/n-quads']
 this can be either a GSP import or a SPARQL query.
 */
putResource['application/n-quads'] = {};

putResource['application/n-quads']["application/sparql-query"] = function(location, content, options, continuation, fail) {
  log.debug("putResource: ", options);
  function succeed(response) {
    log.trace("putResource['application/n-quads']: response: ", response);
    var contentType = response.headers.get('Content-Type');
    function acceptText(document) {
      log.trace("document:", document);
      var graph;
      if (document) {
        graph = RDFEnvironment.theEnvironment.decode(document, contentType);
      } else {
        graph = RDFEnvironment.theEnvironment.createGraph([]);
      }
      log.trace("putResource: graph:", graph);
      graph.location = location;
      graph.contentType = mediaTypeStem(contentType);
      continuation(graph);
    }
    log.trace("putResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    putResource['application/n-quads'](location, content, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(HTTP.put(location, content, options));
};
putResource['application/n-quads']["application/sparql-update"] = putResource['application/n-quads']["application/sparql-query"];

putResource['application/n-quads']["*"] = function(location, content, options, continuation, fail) {
  log.debug("putResource: ", options);
  function succeed(response) {
    log.trace("putResource['application/n-quads']: response: ", response);
    var contentType = response.headers.get('Content-Type');
    function acceptText(document) {
      log.trace("document:", document);
      var graph;
      if (document) {
        graph = RDFEnvironment.theEnvironment.decode(document, contentType);
      } else {
        graph = RDFEnvironment.theEnvironment.createGraph([]);
      }
      log.trace("putResource: graph:", graph);
      graph.location = location;
      graph.contentType = mediaTypeStem(contentType);
      continuation(graph);
    }
    log.trace("putResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    putResource['application/n-quads'](location, content, newOptions, continuation, fail);
  }
  promiseHandler(location, options, succeed, retry, fail)(GSP.put(location, content, options));
};

putResource['application/n-triples'] = putResource['application/n-quads'];



/**
 Present authentication dialogs:
   authentication_credentials_prompt
   authentication_token_prompt

 The credentials version includes fields for identity and password.
 The token version accepts just an authentication token.
 They are invoked with default field values and a continuation.
 If confirmed, invoke that continuation with an authentication object {identity: token: password:}
 Allow an optional cancel continuation.
 */
// https://stackoverflow.com/questions/9554987/how-can-i-hide-the-password-entered-via-a-javascript-dialog-prompt

export function authentication_set(location, authentication) {
  return (responseHandler.setAuthentication(location, authentication));
}

export function authentication_prompt(options) {
  return (authentication_token_prompt(options));
}


export function authentication_credentials_prompt(options) {
    var title = options.title || "Please enter",
        host = options.host || Cell.hostname,
        identityLabel = options.identityLabel || "Identity",
        passwordLabel = options.passwordLabel || "Password",
        submitLabel = options.submitLabel || "Submit",
        cancelLabel = options.cancelLabel || "Cancel";
    var position = options.position || [4,4];
    var submitContinuation = options.submit || options.accept;
    var cancelContinuation = options.cancel;
    if(! submitContinuation) { 
      throw (new Error("authentication_prompt requires a commit continuation."));
    };
                   
    var prompt = document.createElement("form");
    prompt.className = "authentication_prompt dialog";
    
    var submit = function() {
      var identity = identityInput.value;
      if (identity.length == 0) {identity = null; }
      var password = passwordInput.value;
      if (password.length == 0) {password = null; }
      document.body.removeChild(prompt);
      submitContinuation((identity || "") + ":" + (password || ""));
    };
    var cancel = function() {
        document.body.removeChild(prompt);
        if (cancelContinuation) {
          cancelContinuation();
        }
    };
    var handleReturn = function(e) {
        if (e.keyCode == 13) submit();
    }
    var titleElement = document.createElement("div");
    titleElement.id = "title";
    titleElement.textContent = `${title} (@${host})`;
    prompt.appendChild(titleElement);

    var passwordLabelElement = document.createElement("label");
    passwordLabelElement.id = "passwordLabel";
    passwordLabelElement.textContent = passwordLabel;
    prompt.appendChild(passwordLabelElement);

    var passwordInput = document.createElement("input");
    passwordInput.type = "password";
    passwordInput.value = options.password || "";
    passwordInput.addEventListener("keyup", handleReturn, false);
    prompt.appendChild(passwordInput);

    var identityLabelElement = document.createElement("label");
    identityLabelElement.id = "identityLabel";
    identityLabelElement.textContent = identityLabel;
    prompt.appendChild(identityLabelElement);

    var identityInput = document.createElement("input");
    identityInput.addEventListener("keyup", handleReturn, false);
    identityInput.value = options.identity || "";
    prompt.appendChild(identityInput);

    var submitButton = document.createElement("button");
    submitButton.textContent = submitLabel;
    submitButton.id = "submit";
    submitButton.addEventListener("click", submit, false);
    prompt.appendChild(submitButton);
    var cancelButton = document.createElement("button");
    cancelButton.textContent = cancelLabel;
    cancelButton.id = "cancel";
    cancelButton.addEventListener("click", cancel, false);
    prompt.appendChild(cancelButton);
    prompt.style.zIndex = 100;
    prompt.style.position = "fixed";
    if (position[0] < 0) {
      prompt.style.right = (-position[0])+'px';
    } else {
      prompt.style.left = position[0]+'px';
    }
    if (position[1] < 0) {
      prompt.style.bottom = (-position[1])+'px';
    } else {
      prompt.style.top = position[1]+'px';
    }
    document.body.appendChild(prompt);
};


export function authentication_token_prompt(options) {
    var title = options.title || "Please enter for",
        host = options.host || Cell.hostname,
        tokenLabel = options.tokenLabel || "Token",
        submitLabel = options.submitLabel || "Submit",
        cancelLabel = options.cancelLabel || "Cancel";
  var position = options.position || [20,20];
    var submitContinuation = options.submit || options.accept;
    var cancelContinuation = options.cancel;
    if(! submitContinuation) { 
      throw (new Error("authentication_prompt requires a commit continuation."));
    };
                   
    var prompt = document.createElement("form");
    prompt.className = "authentication_prompt dialog";
    
    var submit = function() {
      var token = tokenInput.value;
      if (token.length == 0) {token = null; }
      document.body.removeChild(prompt);
      submitContinuation(":" + (token || ""));
    };
    var cancel = function() {
        document.body.removeChild(prompt);
        if (cancelContinuation) {
          cancelContinuation();
        }
    };
    var handleReturn = function(e) {
        if (e.keyCode == 13) submit();
    }
    var titleElement = document.createElement("div");
    titleElement.id = "title";
    titleElement.textContent = `${title} (@${host})`;
    prompt.appendChild(titleElement);

    var tokenLabelElement = document.createElement("label");
    tokenLabelElement.id = "tokenLabel";
    tokenLabelElement.textContent = tokenLabel;
    prompt.appendChild(tokenLabelElement);

    var tokenInput = document.createElement("input");
    tokenInput.type = "password";
    tokenInput.value = options.token || "";
    tokenInput.addEventListener("keyup", handleReturn, false);
    prompt.appendChild(tokenInput);

    var submitButton = document.createElement("button");
    submitButton.textContent = submitLabel;
    submitButton.id = "submit";
    submitButton.addEventListener("click", submit, false);
    prompt.appendChild(submitButton);
    var cancelButton = document.createElement("button");
    cancelButton.textContent = cancelLabel;
    cancelButton.id = "cancel";
    cancelButton.addEventListener("click", cancel, false);
    prompt.appendChild(cancelButton);
    prompt.style.zIndex = 100;
    prompt.style.position = "fixed";
    if (position[0] < 0) {
      prompt.style.right = (-position[0])+'px';
    } else {
      prompt.style.left = position[0]+'px';
    }
    if (position[1] < 0) {
      prompt.style.bottom = (-position[1])+'px';
    } else {
      prompt.style.top = position[1]+'px';
    }
    document.body.appendChild(prompt);
};

if (! document.querySelector('#authentication_prompt_style')) {
  var style = document.createElement('style');
  style.id = "authentication_prompt_style";
  style.type = "text/css";
  style.innerText = `
.authentication_prompt {
    font-size: 10pt;
    position:fixed;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(4, 1fr);
    border: solid 2px black;
    border-radius: 4px;
    width: 300px;
}
.authentication_prompt #title {
    display:block;
    background-color: #f8f8f8;
    text-align: center; 
    grid-column-start: 1;
    grid-column-end: 4;
    grid-row: 1;
    border-bottom: solid 1px black;
    margin-left: 4px;
    margin-right: 4px;
    margin-bottom: 2px;
}
.authentication_prompt label {
    display:block; 
    grid-column-start: 1;
    grid-column-end: 2;
    width: 7em;
    margin-left: 4px;
}
.authentication_prompt input {
    display:block; 
    grid-column-start: 2;
    grid-column-end: 4;
    width: auto;
    margin-right: 4px;
}
.authentication_prompt button {
    display:block; 
    grid-row-start: 4;
    grid-row-end: 5;
    margin-left: 4px;
    margin-right: 4px;
    margin-top: 1px
}
.authentication_prompt #submit { grid-column: 1; }
.authentication_prompt #cancel { grid-column: 3; }
`;
  document.querySelector('head').appendChild(style);
}
window.authentication_prompt = authentication_prompt;
window.authentication_token_prompt = authentication_token_prompt;
window.authentication_credentials_prompt = authentication_credentials_prompt;




