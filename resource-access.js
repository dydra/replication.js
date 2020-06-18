// .js definitions for resource access operators
//
// they are arranged by application layer protocol and method
//
// headResource
// deleteResource
// getResource
// postResource
// putResource

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
                  implementation(location, options, accept, fail || reject || log.warn); })
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
  var mediaType = options['Accept'];
  if (! mediaType) {
    console.trace();
    throw (new Error("postResource: Accept option is required."));
  }
  var match = mediaTypeStem(mediaType);
  if (match) {
    var implementation = postResource[match];
    if (implementation) {
      // invoke the implementation. specify the static class context and pass the given arguments
      if (continuation) {
        log.debug("postResource: with continuation");
        return (implementation(location, content, options, continuation, fail || log.warn));
      } else {
        log.debug("postResource: as promise");
        return (new Promise(function(accept, reject) {
                 implementation(location, content, options, accept, fail || reject || log.warn); })
               );
      }
    } else {
      console.trace();
      throw (new Error(`postResource: unimplemented media type: '${mediaType}'`));
    }
  } else {
    console.trace();
    throw (new Error(`postResource: unrecognized media type: '${mediaType}'`));
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
                 implementation(location, content, options, accept, fail || reject || log.warn); })
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


function responseHandler (location, options, succeed, retry, fail) {
  var savedAuth = responseHandler.map.get(location);
  var optionsAuth = options.authentication;
  if (savedAuth && !optionsAuth) {
    Object.assign(options, {authentication: savedAuth});
  }
  function ensureSuccessfulResponse (response) {
    console.warn("ensureSuccessfulResponse: ", response);
    if (response instanceof Response) {
      if (response.ok) {
        console.log(response.status, location);
        succeed(response);
      } else if (response.status == 401) {
          console.log("401: ", location);
        function localRetry(authentication) {
          authentication = (authentication.identity || "") + ':' + (authentication.token || "");
          responseHandler.map.set(location, authentication);
          options = Object.assign({}, options, {authentication: authentication});
          log.debug("esr: augmented options: ", options);
          retry(options);
        }
        console.log("prompt: ", localRetry);
        authentication_prompt({location: location, submit: localRetry});
      } else {
        console.log(response.status, location);
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

function promiseHandler (location, options, succeed, retry, fail = console.warn) {
  var savedAuth = responseHandler.map.get(location);
  var optionsAuth = options.authentication;
  if (savedAuth && !optionsAuth) {
    Object.assign(options, {authentication: savedAuth});
  }
  function retryUntilSuccessful (promise) {
    console.warn("retryUntilSuccessful: ", promise);
    function accepted(response) {
      if (response instanceof Response) {
        if (response.ok) {
          console.log(response.status, location);
          succeed(response);
        } else if (response.status == 401) {
          console.log("401: ", location);
          function localRetry(authentication) {
            authentication = (authentication.identity || "") + ':' + (authentication.token || "");
            responseHandler.map.set(location, authentication);
            options = Object.assign({}, options, {authentication: authentication});
            log.debug("esr: augmented options: ", options);
            retry(options);
          }
          console.log("prompt: ", localRetry);
          authentication_prompt({location: location, submit: localRetry});
        } else {
          console.log(response.status, location);
          // a failed response aborts references to the text body
          log.warn(`responseHandler ${location}: failed ${response.status}`);
          fail(response);
        }
      } else {
        console.log(response);
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
    log.warn("getResource['application/n-quads']: response: ", response);
    var contentType = response.headers.get('Content-Type');
    function acceptText(document) {
      log.warn("document:", document);
      var graph = RDFEnvironment.theEnvironment.decode(document, contentType);
      log.warn("getResource: graph:", graph);
      graph.location = location;
      continuation(graph);
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
      sheet.mediaType = contentType;
      sheet.location = location;
      continuation(sheet);
    }
    blob.arrayBuffer().then(acceptBuffer);
  }
  getResource['application/octet-stream'](location, options, continuation);
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
      csv.mediaType = contentType;
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
      html.mediaType = contentType;
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
      json.mediaType = contentType;
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
    promiseHandler(location, options, continuation, retry, fail)(SPARQL.get(location, query, options));
  } else {
    console.trace();
    throw (new Error("query is required:"));
  }
}


/**
 Request a query with the expection that it be reflected back
 */
postResource['application/sparql-query'] = function(location, query, options, continuation, fail) {
  // log.debug("postResource: ", location, query, options);
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
  promiseHandler(location, options, continuation, retry, fail)(SPARQL.post(location, query, options));
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
      json.mediaType = contentType;
      json.location = location;
      continuation(json);
    }
    log.debug("postResource: response: ", response, contentType);
    response.json().then(acceptJSON);
  }
  function retry(newOptions) {
    postResource['application/sparql-query+json'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, continuation, retry, fail)(SPARQL.post(location, query, options));
}

/**
 Request a query with the expectation that it be reflected back - as query algebra
 */
postResource['application/sparql-query-algebra'] = function(location, query, options, continuation, fail) {
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
    postResource['application/sparql-query-algebra'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, continuation, retry, fail)(SPARQL.post(location, query, options));
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
  promiseHandler(location, options, continuation, retry, fail)(SPARQL.post(location, query, options));
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
  promiseHandler(location, options, continuation, retry, fail)(SPARQL.post(location, query, options));
}

postResource['application/sparql-results+json'] = function(location, query, options, continuation, fail) {
  // log.debug("postResource: ", location, query, options);
  function succeed(response) {
    var contentType = response.headers.get('Content-Type');
    function acceptJSON(json) {
      log.debug("json:", json);
      json.mediaType = contentType;
      json.location = location;
      continuation(json);
    }
    // log.debug("postResource: response: ", response, contentType);
    response.json().then(acceptJSON);
  }
  function retry(newOptions) {
    postResource['application/sparql-results+json'](location, newOptions, continuation, fail);
  }
  promiseHandler(location, options, continuation, retry, fail)(SPARQL.post(location, query, options));
}

/**
 A POST request for application/json is handled as graphql.
 The simpelform of tht api allows no error reccovery.
 */

postResource['application/json'] = function(location, query, options, continuation, fail) {
  log.debug("postResource: ", location, query, options);
  // the signature is url, query variables
  GQLRequest(location, query, {})
    .then(function (json) {
      // log.debug("json:", json);
      // not available there: json.mediaType = contentType;
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
postResource['application/n-quads'] = function(location, content, options, continuation, fail) {
  log.debug("postResource: ", options);
  function succeed(response) {
    log.trace("postResource['application/n-quads']: response: ", response);
    var contentType = response.headers.get('Content-Type');
    function acceptText(document) {
      log.trace("document:", document);
      var graph = RDFEnvironment.theEnvironment.decode(document, contentType);
      log.trace("postResource: graph:", graph);
      graph.location = location;
      continuation(graph);
    }
    log.trace("postResource: response: ", response, contentType);
    response.text().then(acceptText);
  }
  function retry(newOptions) {
    postResource['application/n-quads'](location, newOptions, continuation, fail);
  }
  if (['graph', 'subject', 'predicate', 'object'].find(function(role) { return(!(options[role] == undefined)); })) {
    promiseHandler(location, options, continuation, retry, fail)(GSP.post(location, content, options));
  } else {
    promiseHandler(location, options, continuation, retry, fail)(SESAME.post(location, content, options));
  }
};
postResource['application/n-triples'] = function(location, content, options, continuation) {
  return (postResource['application/n-quads'](location, content, options, continuation));
}



/**
 Present an authentication dialog with options for labels for identity and toekn fields
 If confirmed, invoke that continuation with an authentication boject {identity: token:}
 Allow an optional cancel continuation.
 */
// https://stackoverflow.com/questions/9554987/how-can-i-hide-the-password-entered-via-a-javascript-dialog-prompt

export function authentication_prompt(options) {
    var title = options.title || "Please enter",
        host = options.host || Cell.hostname,
        tokenLabel = options.tokenLabel || "Token",
        identityLabel = options.identityLabel || "Identity",
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
      var token = tokenInput.value;
      if (token.length == 0) {token = null; }
      document.body.removeChild(prompt);
      submitContinuation({identity: identity, token: token});
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

