// Copyright (c) 2019 datagraph gmbh

/**
 @overview
The classes

    GraphDatabase
    GDBTransaction
    GDBObjectStore

provide the javascript/graph mediation layer in a form which combines the
IndexedDB and JDO APIs. It support the standard operations

    open, close
    transaction
    createObjectStore
    get, put, delete

Additional operators extend IndexedDB semantics to accommodate basic JDO/JPA
behaviour:
    attach, detach
    commit

The application-thread API operators transform between native javascript
objects and graphs to be exchanged as websockets/fetch requests with a remote
graph store which acts as the Graph storage service.
The object<->graph transformation relies on the GraphObject state tracking
and the field<->term mapping mechanisms which a GDBObjectStore delegates
to a GraphEnvironment.

The IndexedDB transaction behaviour is combined with that of JDO.
The former recommendation specifies that, once no further operation is
possible, a transaction commits.

    http://blog.nparashuram.com/2011/11/indexeddb-apis-javascriptnext.html
    https://w3c.github.io/IndexedDB/#async-execute-request

As per the w3c IndexedDB description, operations are queued as requests and
each is run asynchronously, but in turn, in the order created. Upon completion,
to notify the application either onerror or onsuccess is invoked for each
request.
Once a notification returns and no further request is pending, it is
expected that the active transaction have dynamic extent only, that is, the
main thread maintains no control flow which expect the transaction to have
indefinite extent and to be able to an additional request. Under this
assumption, the transaction can be be committed as soon a no request is
pending.
A non-local control transfer from a request notification should abort the
transaction.
When the transaction commits, any managed changes which happen during the
transaction's extent are marshalled and excuted as well, after which instance
specific onsuccess/failure invoked.
In addition to the implicit completion, an explicit commit operation
can apply pending request and managed changes manually.

The put/get functions rely on promises to implement asynchronous behaviour.
see
    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
For a put operation, the execution function marshals the object state into
a pending request and immediately resolves the promise.
It provides a then function which implements the IndexedDB asynchronous
behaviour by iterating over all accumulated put requests, caching the request
data to be transmitted when the transaction completes and invoking each
request's onsuccess.
For a get request, the execute function initiates the retrieval and
resolves the promise when the response arrives, while the then function
unmarshals the result and invokes the request's onsuccess to the the
data to the application.
When executing the then functions, shuld no request remain, the transaction
is completed. but transmitting all accumulated combined put data and
patches from managed objects.


The default implementation uses the W3C SPARQL and Graph Store Protocols to
communicate with a CRDT-as-RDF service. A GraphEnvironment combines JSON-LD
term/field mapping together with graph manipulation utilites from rdflib
to provie the default implemention of the abstract interface.

*/

import {GraphEnvironment} from './graph-environment.js';
import {GraphObject} from './graph-object.js';
import {NotFoundError} from './errors.js';
import * as $uuid from './revision-identifier.js';

const now = Date.now;
window.thisDatabase = null;

class GraphFactory extends IDBFactory {

  open(name, location, authentication) {
    return (new GraphDatabase(name, location, authentication));
  }

  cmp(iri1, iri2) { // why is this necessary
    return (iri1.equals(iri2));
  }

  deleteDatabase(name) {
    console.log("deleteDatabase is ignored");
  }
}


function openWebSocket(database) {
  var location = database.location;
  console.log("GraphDatabase.openWebSocket: location", location);
  var p = new Promise(function (resolve, reject) {
    var url = new URL(location);
    var host = url.host;
    var wsURL = 'wss://' + host + '/ws'; // just /ws
    var websocket = null;

    console.log("GraphDatabase.openWebSocket: url", wsURL);
    try {
      websocket = new WebSocket(wsURL);
    } catch(e) {
      console.log('openWebSocket.new failed: ', e);
      return (null);
    }
    console.log("GraphDatabase.openWebSocket: websocket", websocket);
    websocket.onerror = function(event) {
      console.log("GraphDatabase.openWebSocket: error ", event, websocket);
      reject(event);
    };
    websocket.onclose = function() {
      console.log("GraphDatabase.openWebSocket: onclose");
    }
    websocket.onmessage = function (event) {
      // console.log("GraphDatabase.openWebSocket: onmessage", event)
      database.onmessage(event.data);
    };
    websocket.onopen = function (event) {
      console.log("GraphDatabase.openWebSocket: onopen", websocket, event);
      resolve(websocket);
    };
  });
  return (p);
}

// extract the request line, headers and body from a websocket response.
function onmessage_parse(document, options = {hasResponseLine: true}) {
  var lineRegex = /([^\r\n]*)\r\n/;
  var nextLine = function () {
    var result = document.match(lineRegex);
    if (result) {
      // console.log("nextLine: ", result);
      document = document.substring(result[0].length);
      // console.log("nextLine: ", result, document);
      return (result[1]);
    } else {
      return (null);
    }
  }
  var parseRRLine = function () {
    var responseLineRegex = /^([^\s]+)\s+([^\s]+)\s+(.*)$/;
    var line = nextLine() || "";
    var match = line.match(responseLineRegex);
    if (!match) {
      throw(`onmessage_parse: invalid response line: "${line}"`);
    }
    var field1 = match[1];
    if (['DELETE', 'PATCH', 'POST', 'PUT'].includes(field1)) {
      // is a request
      return ({httpVersion: match[3], method: field1, path: match[2]});
    } else {
      // is a response
      return ({httpVersion: field1, statusCode: match[2], reasonPhrase: match[3]});
    }
  }
  var parseHeaderLine = function () {
    var headerLineRegex = /^([^:]+)\s*:\s*(.*)$/;
    var line = nextLine() || "";
    if (line.length == 0) {
      return (null);
    } else {
      var match = line.match(headerLineRegex);
      if (!match) {
        throw(`onmessage_parse: invalid header line: "${line}"`);
      }
      return ({name: match[1], value: match[2]});
    }
  };
  var parseHeaders = function () {
    var headers = {};
    for (var header = parseHeaderLine(); header; header = parseHeaderLine()) {
      headers[header.name] = header.value;
    }
    return (headers);
  };
  var parseBody = function () {
    return (document);
  }
  
  var responseLine = (options.hasResponseLine ? parseRRLine() : {});
  // console.log("GraphDatabase.response line:", responseLine);
  var headers = parseHeaders();
  // console.log("GraphDatabase.parse_response: headers", headers);
  if (responseLine.method) {
    return (new Request(responseLine.path, {method: responseLine.method, headers: headers,
                                            body: parseBody()}));
  } else {
    return (new Response(parseBody(), {status: responseLine.statusCode, statusText: responseLine.reasonPhrase,
                                       headers: headers}));
  }
}
/*
var resp = onmessage_parse("HTTP/1.1 200 OK\r\nContent-Type: application/n-quads\r\n\r\n<http://x.o/s> <http://x.o/p> 'o' .")
*/

export class GraphDatabase { // extends IDBDatabase {
  constructor(name, location, authentication, options = {}) {
    //super();
    //console.log('GraphDatabase.constructor');
    //console.log(arguments);
    this.name = name;
    this.baseETag = this.makeUUID();
    this.nodeAddress = this.baseETag.substring(24);  // use to filter or check mirrored replications
    this.location = location;
    this.revision = "HEAD";
    this.revisions = [];
    this.authentication = authentication;
    this.objectStores = {};
    this.websocket = null;
    this.disposition = options.disposition || this.name.replace(/ /g,'');
    this.environment = options.environment ||
     new (options.environmentClass || GraphDatabase.graphEnvironmentClass)();

    //console.log(this.objectStores);
    var thisDatabase = this;
    if (location) {
      new Promise(function(resolve, reject) {
        resolve(thisDatabase);
      }).then(function(that) {
        //console.log("inpromise");
        //console.log(thisDatabase);
        //console.log(that);
        thisDatabase.head({}).then(function(response) {
          //console.log("head responded");
          //console.log(response);
          //for (var [k,v] of response.headers.entries()) {console.log([k,v])};
          var etag = response.headers.get('etag');
          //console.log(`etag: '${etag}'`);
          if (etag) {
            thisDatabase.revision = etag;
          }
        })
      });
      // console.log("GraphDatabase: options.asynchronous", options.asynchronous);
      if (options.asynchronous) {
        // console.log("GraphDatabase: opening asyncronous connection");
        try {
          openWebSocket(this).then(function(websocket) {
            thisDatabase.setWebsocket(websocket);
          });
        } catch(e) { console.log("GraphDatabase.openWebSocket failed: ", e); }
      }
    }
    window.thisDatabase = thisDatabase;
  }

  setWebsocket(websocket) {
    // console.log("GraphDatabase.setWebsocket:", websocket);
    this.websocket = websocket;
    var url = new URL(this.location);
    var path = url.pathname;
    var CRLF = '\r\n';
    var method = 'PUT';
    var requestLine = `${method} ${path}/disposition HTTP/1.0`;
    var headers = "";
     headers += `Content-Disposition: replicate=${this.disposition}` + CRLF;
     headers += `ETag: ${this.baseETag}` + CRLF;
    if (this.authentication) {
      headers += "Authorization: Basic " + btoa(":" + this.authentication) + CRLF;
    }
    var data = requestLine + CRLF + headers + CRLF;
    // console.log("GraphDatabase.setWebsocket.send: data:", data);
    websocket.send(data);
    return(websocket);
  }

  onmessage(data) {
    // if there is some handler for the given media type, delegate to that to handle the message
    try {
      // console.log("onmessage: ", data);
      var response = onmessage_parse(data);
      var contentType;
      var match;
      var etag = response.headers.get('ETag');
      if (etag && this.revisions.find(function(p) { return (etag == p.revision); })) {
        console.log("onmessage: reflected", etag, data);
      } else {
        if ((contentType = response.headers.get('Content-Type')) &&
            (match = contentType.match(/([^;]+)(?:;.*)?/))) {
          var handler = onmessage[match[1]];
          // console.log("onmessage: contentType ", contentType, handler);
          if (handler) {
            handler(this, response);
          } else {
            throw (new Error(`GraphDatabase.onmessage: no handler defined for media type: ${contentType}`));
          }
        } else {
          console.log("onmessage: no media type", response);
        }
      }
    } catch (e) {
      console.log("onmessage: ", e, data);
    }
  }

  close() {
    // could check to see if any requests are pending.
    // otherwise, nothing to do
  }

  name() {
    return( this.name );
  }

  version() {
    return( this.revision );
  }

  createObjectStore(name, options = {}) {
    //console.log('in gdb createObjectStore');
    //console.log(name);
    if (!name) {
      throw new TypeError("name is required.");
    }
    var environment = options['environment'] || this.environment;
    var old = this.objectStores[name];
    if (old) {
      old.environment = environment;
      return( old );
    } else {
      var newStore = new GDBObjectStore(name, {environment: environment});
      this.objectStores[name] = newStore;
      Object.defineProperties(newStore,
                             {database: {value: this, writable: false}});
      //console.log(this.objectStores);
      return( newStore );
    }
  }

  findObjectStore(name) {
    // console.log('findObjectStore', name);
    var store = this.objectStores[name];
    if (store) {
      return (store);
    } else {
     throw new NotFoundError(`store not found: database: ${this}, name: ${name}`);
    }
  }

  cloneObjectStore(name) {
    var store = this.findObjectStore(name);
    var clone = Object.assign(Object.create(GDBObjectStore.prototype, {}), store);
    clone.transaction = null;
    return (clone);
  }

  objectStoreNames() {
    return (this.objectStores.keys());
  }

  deleteObjectStore(name) {
    if (!name) {
      throw new TypeError("name is required.");
    }
    if (GraphDatabase.objectStores.contains(name)) {
      var oldStore = GraphDatabase.objectStores[name];
      delete GraphDatabase.objectStores[name];
      return( oldStore );
    } else {
      return( null );
    }
  }

  transaction(names = this.objectStoreNames(), mode) {
    var transaction = new GDBTransaction(this, names, mode);
    transaction.environment = this.environment;
    return (transaction);
  }

  makeUUID() { // override
    return ($uuid.makeUUIDString());
  }

  describe(keyObject, options, continuation) {
    throw (new Error(`${this.constructor.name}.describe must be defined`));
  }
  get(options, continuation) {
    throw (new Error(`${this.constructor.name}.get must be defined`));
  }
  head(options, continuation) {
    throw (new Error(`${this.constructor.name}.get must be defined`));
  }
  patch(content, options, continuation) {
    // the state manipulation aspect, but without the transport
    var patch = this.environment.createPatch(content)
    patch.date = Date.now;
    patch.revision = options.etag;
    this.revisions.push(patch);
  }
  put(content, options, continuation) {
    throw (new Error(`${this.constructor.name}.put must be defined`));
  }

  findObject(id) {
    // console.log("findObject", id);
    for (var name in this.objectStores) {
      var store = this.objectStores[name];
      var found = store.objects.get(id);
      if (found) {
        return(found);
      }
    }
    return (null);
  }
}


GraphDatabase.open = function(name, location, authentication, options = {}) {
  //console.log('in open');
  var dbClass = (options.databaseClass || GraphDatabase.graphDatabaseClass);
  var db = new dbClass(name, location, authentication, options);
  //console.log('opened');
  //console.log(db);
  //console.log(db.constructor.name);
  return (db);
}
GraphDatabase.graphDatabaseClass = GraphDatabase;
GraphDatabase.graphEnvironmentClass = GraphEnvironment;

export var onmessage = {};

onmessage['*/*'] = function(db, response) {
  // do nothing
}
onmessage['application/n-quads'] = function(db, response) {
}

onmessage['multipart/related'] = function(db, response) {
  // decode the multipart document as patches to the objects described by the
  // respective subjects
  response.text().then(function(document) {
    try {
      var contentType = response.headers.get('Content-Type');
      var patch = null;
      patch = db.environment.decode(document, contentType);
      if (patch) {
        var deltas = null;
        deltas = db.environment.computeDeltas(patch);
        if (deltas) {
          // console.log("GDBObjectStore.onmessage.multipart: deltas", deltas);
          var gottenObjects = deltas.map(function(idDeltas) {
            // console.log("GDBObjectStore.onmessage: next delta", idDeltas);
            var [id, deltas] = idDeltas;
            var object = db.findObject(id);
            // console.log("GDBObjectStore.onmessage: found:", object);
            if (object) {
              object.onupdate(deltas);
            } else {
              object = idDeltas['object'];
              // console.log("GDBObjectStore.onmessage: created", object); 
              if (object) {
                object.oncreate(deltas);
              }
            }
            return (object);
          });
          console.log("GDBObjectStore.onmessage: messaged", gottenObjects);
        }
      } else {
        console.log("GDBObjectStore.onmessage: no patch", response);
      }
    } catch(error) {
      console.log("onmessage['multipart/related']: error", error);
      return (null)
    }
  });
}


export class GDBTransaction { // extends IDBTransaction {
  constructor(database, names = [], mode = "readonly", options = {}) {
    //console.log('transaction.constructor: names');
    //console.log(names);
   
    if (typeof(names) == 'string') {
      names = [names];
    }
    var thisTransaction = 
      Object.create(GDBTransaction.prototype,
                          {database: {value: database},
                           revisionID: {value: (database.makeUUID())},
                           parentRevisionID: {value: "HEAD"},
                           mode: {value: mode}});
    var stores = names.map(function(name) {
      var store = database.cloneObjectStore(name);
      //console.log(`transaction store for '${name}’`, store);
      if (store.transaction) {
        throw new Error(`store is already in a transaction: ${thisTransaction}: ${store}.${store.transaction}`);
      } else {
        //console.log('set transaction');
        store.transaction = thisTransaction;
      }
      return (store);
    });
    thisTransaction.disposition = options.disposition || database.disposition;
    thisTransaction.stores = stores;
    //console.log('GDBTransaction.constructed');
    //console.log(thisTransaction);
    return (thisTransaction);
  }

  /* in db only
  createObjectStore(name, options = {}) {
    var store = database.createObjectStore(name, {environment: (options.environment || this.environment)});
    return( Object.defineProperties(store,
                                    {transaction: {value: this, writable: false}}) );
  }*/

  objectStore(name) {
    var store = this.stores[name];
    if (store) {
      return (store);
    }
    throw(new NotFoundError(`store not found: '${name}'.`));
  }

  /* commmit
   * generates no additional asynchronous control thread as it is
   * either already in one, as a promise's then function, or
   * an explicit invocation from the application thread should be able
   * to assume that any communication has occurred when the call has returned.
   */
  commit() {
    console.log(`GDBTransaction.commit @${this.revisionID} complete`, this);
    // iterate over the owned stores;
    // for each, get its delta graph
    var posts = [];
    var puts = [];
    var deletes = [];
    this.stores.forEach(function(store) {
      var patch = store.asPatch();
      deletes = deletes.concat(patch.delete ? patch.delete.statements : []);
      posts = posts.concat(patch.post ? patch.post.statements : []);
      puts = puts.concat(patch.put ? patch.put.statements : []);
    });
    // pass the collected operations through to the remote Graph
    var request = new CommitRequest(this, this);
    var thisTransaction = this;

    var p = this.database.patch({delete: deletes, post: posts, put: puts},
                                {contentDisposition: this.disposition,
                                 etag: this.revisionID},
                                function(response) {
                                  thisTransaction.cleanObjects();
                                  if (response.onsuccess) {
                                    response.onsuccess(new SuccessEvent("success", "commit", response.result));
                                  }
                                  // console.log("commit response", response);
                                  // console.log("headers", response.headers);
                                  // for (var [k,v] of response.headers.entries()) {console.log([k,v])};
                                  var etag = response.headers.get("etag");
                                  if (etag) {
                                    thisTransaction.database.revision = etag;
                                  }
                                  console.log(`GDBTransaction.commit @${thisTransaction.revisionID} complete`);
                                  return (response) ;
                                });
    return (request);
  }

  commitIfComplete() {
    if (! this.stores.find(function(store) {
            // if some requests is pending, cannot yet commit the transaction
            return (store.requests.length > 0);
          })) {
      return (this.commit());
    } else {
      return (null);
    }
  }

  cleanObjects () {
    this.stores.forEach(function (store) { store.cleanObjects(); });
  }

/*
  asPatch() {
    var posts = [];
    var puts = [];
    var deletes = [];
    this.database.objects.forEach(function(object) {
      var patch = object.asPatch();
      deletes = deletes.concat(patch.delete || []);
      posts = posts.concat(patch.post || []);
      puts = puts.concat(patch.put || []);
    });
    return ({delete: deletes, post: posts, put: puts});

  }*/

  abort() {
    // revert all attached objects
    this.stores.forEach(function(store) { store.abort(); });
    return (this);
  }

}


export class GDBObjectStore { // extends IDBObjectStore {
  constructor(name, options = {}) {
    // super(name);
    this.name = name;
    this.environment = options.environment;
    this.contentDisposition = options.contentDisposition;
    this.objects = new Map();
    this.requests = [];
    this.patches = [];
    this.transaction = null;
    this.database = null;
  }

  put(object, key = this.computeKey(object)) {  // single level
    var thisStore = this;
    var request = new PutRequest(this, this.transaction);
    object._state = object.stateNew;
    var p = new Promise(function(accept, reject) {
      var patch = object.asPatch();
      request.patch = patch;
      request.transaction = thisStore.transaction;
      request.result = object;
      this.requests.push(request);
      accept(request);
    });
    p.then(function(requestIgnored) {
      for (request = thisStore.requests.shift();
           request;
           request = this.requests.shift()) {
        // allow the onsuccess to push more requests
        this.patches.push(request.patch);
        request.readyState = "complete";
        if (request.onsuccess) {
          request.onsuccess(new SuccessEvent("success", "put", request.result));
        }
      }
      thisStore.transaction.commitIfComplete();
      return(request);
    }, null);
    return( request );
  }

  // intra-transaction changes are visible?
  //   no: there is no relation between get object id and cached managed objects.
  // needs to be qualified by revision, allowing HEAD, HEAD^^, etc as well as uuid
  // in order to implement roll-back/forward
  get(key) {
    console.log("GDBObjectStore.get", key, this);
    var thisStore = this;
    var request = new GetRequest(thisStore, thisStore.transaction);
    var p = null;
    thisStore.requests[key] = request;
    // console.log(request);
    switch (typeof(key)) {
    case 'string' :
      console.log("GDBObjectStore.get: as string", key);
      p = // perform a get retrieve the single instance via from the database
        thisStore.database.get(this.transaction.location,
                          {subject: key, revision: thisStore.revision});
      break;
    case 'object' :
      console.log("GDBObjectStore.get: as object", key);
      p = // construct a describe to retrieve the single instance via from the database
        thisStore.database.describe(key, {revision: thisStore.revision, "Accept": 'application/n-quads'});
      break;
    default :
      return (null);
    }

    // console.log("GDBObjectStore.get: promise", p);
    p.then(function(response) {
      var contentType = response.headers.get['Content-Type'] || 'application/n-quads';
      // console.log("get.continuation", response);
      delete thisStore.requests[key];
      response.text().then(function(text) {
        // console.log("text", text);
        // console.log("store", thisStore);
        // console.log("env", thisStore.environment);
        var decoded = thisStore.environment.decode(text, contentType);
        if (decoded) {
          var deltas = thisStore.environment.computeDeltas(decoded);
          // console.log("GDBObjectStore.get: deltas", deltas);
          var gottenObjects = deltas.map(function(idDeltas) {
            // console.log('GDBObjectStore.get: next delta', idDeltas);
            var [id, deltas] = idDeltas;
            // console.log('GDBObjectStore.get: next idDeltas', idDeltas);
            var object = thisStore.objects.get(id);
            // console.log('GDBObjectStore.get: gotten:', object);
            if (object) {
              object.onupdate(deltas);
            } else {
              object = idDeltas['object'];
              // console.log("GDBObjectStore.get: created", object); 
              if (object) {
                object.oncreate(deltas);
              }
            }
            return (object);
          });
          // console.log("GDBObjectStore.get: gotten objects", gottenObjects);
          if (request.onsuccess) {
            request.result = delta;
            request.onsuccess(new SuccessEvent("success", "get", gottenObjects));
          }
        }
        thisStore.transaction.commitIfComplete();
      });
    });
    return (request);
  }

  /* if the object is attached, just marks its closure
   * otherwise, generate just the single-level patch.
   */
  delete(object) {
    var thisStore = this;
    var request = new DeleteRequest(this, this.transaction);
    var p = new Promise(function(accept, reject) {
      var store = object._store;
      if (store == thisStore) { // just mark the closure
        var deleteObject = function(object) {
          object._state = object.stateDeleted;
          object.persistentValues().forEach(deleteChild);
        }
        var deleteChild = function(child) {
          if (child instanceof GraphObject) {
             thisStore.deleteObject(object);
          } else if (child instanceof Array) {
            child.forEach(deleteChild);
          }
        }
        deleteObject(object);
        request.patch = {};
      } else {
        object._state = object.stateDeleted;
        request.patch = object.asPatch();
      }
      request.result = object;
      this.requests.push(request);
      accept(request);
    });
    p.then(function(requestIgnored) {
      for (request = thisStore.requests.shift();
           request;
           request = thisStore.requests.shift()) {
        // allow the onsuccess to push more requests
        this.patches.push(request.patch);
        request.readyState = "complete";
        if (request.onsuccess) {
          request.onsuccess(new SuccessEvent("success", "delete", request.result));
        }
      }
      thisStore.transaction.commitIfComplete();
      return(request);
    }, null);
    return( request );
  }

  attach(object) {
    // attach the instance to a store
    var thisStore = this;
    var store = object._store;
    //console.log('attaching');
    //console.log(object);
    //console.log(thisStore);
    if (store) {
      // no error, just stop walking
      //if (transaction != this) {
      //  throw new Error(`Object is already attached: ${this}, ${object}.`);
      //} else {}
    } else if (object instanceof GraphObject) {
      var objects = this.objects;
      var attachChild = function(child) {
        if (child instanceof GraphObject) {
          thisStore.attach(object);
        } else if (child instanceof Array) {
          child.forEach(attachChild);
        }
      }
      if (! objects.has(object)) {
        objects.set(object.identifier, object);
        object._store = thisStore;
        object._transaction = thisStore.transaction;
        object.persistentValues(object).forEach(attachChild);
        //console.log('attached');
      }
    }
    return (object);
  }

  detach(object) {
    var thisStore = this;
    var objects = this.objects;
    var detachChild = function(child) {
      if (child instanceof GraphObject) {
        thisStore.detach(object);
      } else if (child instanceof Array) {
        child.forEach(detachChild);
      }
    }
    if (object._store == this) {
      objects.delete(object.identifier);
      object._state = GraphObject.stateNew;
      object._transaction = null;
      object._store = null;
      object.persistentValues(object).forEach(detachChild);
    }
    return (object);
  }

  abort() {
    // revert all attached objects
    this.objects.forEach(function(object, id) {
      if (object._transaction) { // allow for multiple attachments
        var target = object._self || object;
        target._transaction = null;
        target.rollback();
      }
    });
    this.objects = new Map();
    return (this);
  }

  asPatch() {
    // collect and return all accumulated patches
    // in the process, convert from abstract form
    //    {put: [[s,p,o] ... ] ...}
    // the encoding specific to the store implementation
    var thisStore = this;
    var posts = [];
    var puts = [];
    var deletes = [];
    this.patches.forEach(function(patch) {
      deletes = deletes.concat(patch.delete || []);
      posts = posts.concat(patch.post || []);
      puts = puts.concat(patch.put || []);
    });
    this.objects.forEach(function(object, id) {
      // console.log('asPatch: forEach: ', id, object);
      var patch = object.asPatch();
      // console.log('asPatch.forEach');
      // console.log(patch);
      deletes = deletes.concat(patch.delete || []);
      posts = posts.concat(patch.post || []);
      puts = puts.concat(patch.put || []);
    });
    // console.log('asPatch: deletes,posts,puts', deletes, posts, puts);
    var patch = this.environment.createPatch({delete: deletes, post: posts, put: puts});
    this.cleanObjects();
    return (patch);
  }

  cleanObjects() {
    var cleanObject = function(object) {
      if (object instanceof GraphObject) {
        var state = object._state;
        object._state = GraphObject.stateClean;
        object._deltas = null;
      } else { // there should not be anything else
      }
    }
    this.objects.forEach(function(object, id) {cleanObject(object);});
  }


}

class GraphRequest extends IDBRequest {
  constructor(objectStore, transaction) {
    var r = Object.create(GraphRequest.prototype,
                          {error: {value: GraphRequest.prototype.noErrorProvided},
                           success: {value: GraphRequest.prototype.noSuccessProvided},
                           source: {value: objectStore},
                           readyState: {value: "pending"},
                           transaction: {value: transaction},
                           patch: {value: null},
                           result: {value: null}});
    return (r);
  }
  noErrorProvided() {};
  noSuccessProvided() {};
}

export class GetRequest extends GraphRequest {
}
export class PostRequest extends GraphRequest {
}
export class PutRequest extends GraphRequest {
}
export class DeleteRequest extends GraphRequest {
}
export class CommitRequest extends GraphRequest {
}


console.log('graph-database.js: loaded');

/*
GSP.head('https://de8.dydra.com/jhacker/test/service', {},
         function(response) { for (var [k,v] of response.headers.entries()) {console.log([k,v])}})

*/

