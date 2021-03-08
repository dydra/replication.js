// Copyright (c) 2019 datagraph gmbh

/**
 @overview
The classes

 -   GraphDatabase
 -   GDBTransaction
 -   GDBObjectStore

provide the javascript/graph mediation layer in a form which combines the
IndexedDB and JDO APIs. It support the standard operations

 -   open, close
 -   transaction
 -   createObjectStore
 -   get, put, delete

Additional operators extend IndexedDB semantics to accommodate basic JDO/JPA
behaviour:

 -   attach, detach
 -   commit

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

/**
 a GraphDatabase provides the base implementation for object replication to a remote store.
 It follows the pattern exemplified by an IndexedDB database (IDBDatabase), but adds
 logic to support state replication to a graph store
 @abstract
 @property nodeAddress {string} - The V1 UUID stem which identifies this node serves to filter
  out mirrired replication requests
 @property {string} location - The connection string for request to the remote store
 @property {string} authentication - The authentication string for remote requests
 @property {GDBObjectStore} objectStores - A map of object store by name
 @property {string} disposition - The replication route name
 @property {GraphEnvironment} environment - The environment to be used to translate between
  remote representation and namte objects.
 */
export class GraphDatabase { // extends IDBDatabase {
  constructor(name, location, authentication, options = {}) {
    //super();
    console.log('GraphDatabase.constructor');
    console.log(arguments);
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

  /**
   Given an name, create an object store and register it with that name
   */
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

  /**
   Return the object store registered with that name
   */
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

  /**
   Create and return an new transaction associated with the given object store(s)
   */
  transaction(names = this.objectStoreNames(), mode) {
    var transaction = new GDBTransaction(this, names, mode);
    transaction.environment = this.environment;
    return (transaction);
  }

  makeUUID() { // override
    return ($uuid.makeUUIDString());
  }

  /**
   @abstract
   */
  describe(keyObject, options, continuation) {
    throw (new Error(`${this.constructor.name}.describe must be defined`));
  }
  /**
   @abstract
   */
  get(options, continuation) {
    throw (new Error(`${this.constructor.name}.get must be defined`));
  }
  /**
   @abstract
   */
  head(options, continuation) {
    throw (new Error(`${this.constructor.name}.head must be defined`));
  }
  /**
   The base method caches the patch with time and regision tags.
   @param {Object} content
   @param {Array} content.delete
   */
  patch(content, options, continuation) {
    // the state manipulation aspect, but without the transport
    var revision = {patch: content, name: Date.now(), revision: options.etag};
    this.revisions.push(revision);
    return (revision);
  }
  /**
   @abstract
   */
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

/**
 Define the handlers for Websocket messages specific to the message content type
 @todo Shift these to the instance property
 */
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
          var gottenObjects = deltas.map(function(perIdDeltas) {
            // console.log("GDBObjectStore.onmessage: next delta", perIdDeltas);
            var [id, deltas] = perIdDeltas;
            var object = db.findObject(id);
            // console.log("GDBObjectStore.onmessage: found:", object);
            if (object) {
              object.onupdate(deltas);
            } else {
              object = perIdDeltas['object'];
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


/**
 Manage a transaction over an ObjectStore collection
 @property {string} revisionID
 @property {string} disposition
 @property {Array} stores
 @property {GraphDatabase} database
 */
export class GDBTransaction { // extends IDBTransaction {
  constructor(database, names = [], mode = "readonly", options = {}) {
    //console.log("new Transaction", names);
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
      // var store = database.cloneObjectStore(name);
      // do not clone. it is part of the described method, but it breaks the
      // connection to the store used to read. why?
      var store = database.findObjectStore(name);
      //console.log(`transaction store for '${name}’`, store);
      // leave it to the application to have just one transaction per store
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

  /**
   Commmit accumulated changes to the remote store.
   Iterate over the owned object stores, collect their delete/post/put patches,
   delegate to the database with this collected patch.
   When that completes, clear the state on all registered objects and
   record the new revision id in the database.

   This returns no additional asynchronous control thread as, when invoked from
   a control thread in the database, this invocation is either already in an
   asynchronous, as a promise's then function.
   For an explicit invocation from the application thread return a request
   instance which can bind an onsuccess property to recieve control when the
   patch request completes.
   */
  commit() {
    console.log(`GDBTransaction.commit @${this.revisionID}`, this);
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

  /**
   Invoked as the final step in promise chains for transaction-scoped operations, such as get
   and put. Iff no request is still pending, then there is no pending control in the
   application which xcould add to the transaction and it should be completed
   by delegating th ecommit to the remote store in the form of a patch.
   */
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

  /**
   Upon commit completion, set all attached objects to clean.
   */
  cleanObjects () {
    this.stores.forEach(function (store) { store.cleanObjects(); });
  }

  /**
   Abort a transaction by delegating to the transaction's object stores to
   roll back changes in all attached objects
   */
  abort() {
    // revert all attached objects
    this.stores.forEach(function(store) { store.abort(); });
    return (this);
  }

}

/**
 Implement the IndexedDB interface (put, get, delete) and the JDO interface(attach, detach)
 with respect to JavaScript instances and the remote store.
 Support transactional behaviour with asPatch.
 */
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

  /**
   Transfer an object's state to the remote store.
   The state is staged as a patch in a GraphRequest, which is added to this store's collection
   and returned to the application.
   Once control returns to the promise, the patch is collected and once all requests
   are processed, the collected patched are commited.
   @param {Object} object
   */
  put(object) {  // single level
    var thisStore = this;
    var request = new PutRequest(this, thisStore.transaction);
    var patch = object.asPatch();
    console.log("put", object._state, patch, request);
    object._state = object.stateNew;
    var p = new Promise(function(accept, reject) {
      request.patch = patch;
      request.result = object;
      thisStore.requests.push(request);
      accept(request);
    });
    p.then(function(requestIgnored) {
      for (request = thisStore.requests.shift();
           request;
           request = thisStore.requests.shift()) {
        // allow the onsuccess to push more requests
        thisStore.patches.push(request.patch);
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

  /**
   Retrieve an object's state given either an identifier, or an object prototype
   An identifier is used as the subject constraint for a get,
   while a prototype is used to inform a describe.
   Use the store's revision proerty to constraint the request in order to
   suport rollforward/rollback
   @param {(Object|string)} key
   */
  get(key, continuation) {
    console.log("GDBObjectStore.get", key, this);
    var thisStore = this;
    var request = new GetRequest(thisStore, thisStore.transaction);
    var keyId = null;
    var keyObject = null;
    var p = null;
    thisStore.requests[key] = request;
    console.log("get", key, request);

    function acceptGetContent (content) {
      console.log("get.acceptGetContent", content);
      delete thisStore.requests[key];
      if (content) {
        var deltas = thisStore.environment.computeDeltas(content, keyObject);
        // console.log("GDBObjectStore.get: deltas", deltas);
        var gottenObjects = deltas.map(function(perIdDeltas) {
          // console.log('GDBObjectStore.get: next delta', perIdDeltas);
          var [id, deltas] = perIdDeltas;
          console.log('GDBObjectStore.get: next perIdDeltas', perIdDeltas);
          var object = thisStore.objects.get(id);
          // console.log('GDBObjectStore.get: gotten:', object);
          if (object) {
            object.onupdate(deltas);
          } else {
            object = perIdDeltas['object'];
            // console.log("GDBObjectStore.get: created", object); 
            if (object) {
              object.oncreate(deltas);
            }
          }
          object._state = GraphObject.stateClean;
          if (id == keyId) { keyObject = object; }
          continuation(object);
          // it should return
          return (object);
        });
        // console.log("GDBObjectStore.get: gotten objects", gottenObjects);
        request.result = deltas;
        if (request.onsuccess) {
          request.onsuccess(new SuccessEvent("success", "get", gottenObjects));
        }
        if (thisStore.transaction) {
          thisStore.transaction.commitIfComplete();
        }
        continuation(keyObject);
      };
    };
    switch (typeof(key)) {
    case 'string' :
      console.log("GDBObjectStore.get: as string", key);
      keyId = key;
      keyObject = thisStore.objects.get(keyId);
      // perform a get to retrieve the single instance via from the database
      thisStore.database.get({subject: key,
                              revision: thisStore.revision},
                             acceptGetContent);
      break;
    case 'object' :
      console.log("GDBObjectStore.get: as object", key, key.constructor);
      keyId = key.getIdentifier();
      keyObject = key;
      if (keyId) {
        thisStore.objects.set(keyId, key);
        thisStore.database.get({subject: '<'+keyId+'>',
                                revision: thisStore.revision},
                               acceptGetContent);
      } else {
        thisStore.database.describe(key, {revision: thisStore.revision},
                                    acceptGetContent);
      }
      break;
    default :
      continuation (null);
    }

    // console.log("GDBObjectStore.get: promise", p);
    return (request);
  }

  /**
    Generate a deletion patch for the object and its reachable children
    @param {GraphObject} object
   */
  delete(object) {
    var thisStore = this;
    var request = new DeleteRequest(this, thisStore.transaction);
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
      thisStore.requests.push(request);
      accept(request);
    });
    p.then(function(requestIgnored) {
      for (request = thisStore.requests.shift();
           request;
           request = thisStore.requests.shift()) {
        // allow the onsuccess to push more requests
        thisStore.patches.push(request.patch);
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

  /**
   Register an object - and its reachability graph, to cause any changes within a
   transaction to propagate to the remote store when the transaction commits.
   */
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
      var objects = thisStore.objects;
      var attachChild = function(child) {
        if (child instanceof GraphObject) {
          thisStore.attach(object);
        } else if (child instanceof Array) {
          child.forEach(attachChild);
        }
      }
      if (! objects.has(object.getIdentifier())) {
        objects.set(object.getIdentifier(), object);
        object._store = thisStore;
        object._transaction = thisStore.transaction;
        object.persistentValues(object).forEach(attachChild);
        //console.log('attached');
      }
    } console.log("attached", object)
    return (object);
  }

  /**
   Unregister an object
   */
  detach(object) {
    var thisStore = this;
    var objects = thisStore.objects;
    var detachChild = function(child) {
      if (child instanceof GraphObject) {
        thisStore.detach(object);
      } else if (child instanceof Array) {
        child.forEach(detachChild);
      }
    }
    if (object._store == this) {
      objects.delete(object.getIdentifier());
      object._state = GraphObject.stateNew;
      object._transaction = null;
      object._store = null;
      object.persistentValues(object).forEach(detachChild);
    }
    return (object);
  }

  /**
   Roll back changes in all attached objects.
   */
  abort() {
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

  /**
   Collect and return all accumulated patches
   in the process, convert from abstract form
   
     {put: [], post: [], delete: []}
   
   where each array entry is 
   
     [identifier, propertyName, value]

   to capture the respective operation on the identifier object
   */
  asPatch() {
    var thisStore = this;
    var posts = [];
    var puts = [];
    var deletes = [];
    thisStore.patches.forEach(function(patch) {
      deletes = deletes.concat(patch.delete || []);
      posts = posts.concat(patch.post || []);
      puts = puts.concat(patch.put || []);
    });
    thisStore.objects.forEach(function(object, id) {
      // console.log('asPatch: forEach: ', id, object);
      var patch = object.asPatch();
      // console.log('asPatch.forEach');
      // console.log(patch);
      deletes = deletes.concat(patch.delete || []);
      posts = posts.concat(patch.post || []);
      puts = puts.concat(patch.put || []);
    });
    // console.log('asPatch: deletes,posts,puts', deletes, posts, puts);
    var patch = thisStore.environment.createPatch({delete: deletes, post: posts, put: puts});
    thisStore.cleanObjects();
    return (patch);
  }

  /**
   Set the state of all attached objects to clean.
   */
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


export class SuccessEvent extends Event {
  constructor (state, operation, result) {
    super(state);
    this.operation = operation;
    this.result = result;
  }
}

/**
 Combine the object store context and the transaction active at the point when an
 operation was performed to return to the calling application as a handle.
 As the operation progresses, include the patch which serves as the intermediate result.
 @abstract
 @property {(function|null)} onerror - Allows the application to set the error handler
 @property {(function|null)} onsuccess - Allows the application to set the success handler
 */
class GraphRequest extends IDBRequest {
  constructor(objectStore, transaction) {
    var r = Object.create(GraphRequest.prototype,
                          {onerror: {value: GraphRequest.prototype.noErrorProvided},
                           onsuccess: {value: GraphRequest.prototype.noSuccessProvided},
                           source: {value: objectStore},
                           readyState: {value: "pending", writable: true},
                           transaction: {value: transaction},
                           patch: {value: null, writable: true},
                           result: {value: null, writable: true}});
    return (r);
  }
  noErrorProvided() {};
  noSuccessProvided() {};
}

/** */
export class GetRequest extends GraphRequest {
}
/** */
export class PostRequest extends GraphRequest {
}
/** */
export class PutRequest extends GraphRequest {
}
/** */
export class DeleteRequest extends GraphRequest {
}
/** */
export class CommitRequest extends GraphRequest {
}

window.thisDatabase = null;
window.GraphDatabase = GraphDatabase;

// console.log('graph-database.js: loaded');

