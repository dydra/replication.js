## dydra web client support

This library implements a JavaScript web client interface to the Dydra 
RDF service.
It mediates persistence for native JavaScript application and u/i data models
to a remote Dydra service via GSP/HTTP and/or websockets.
The remote service implements either W3C GSP-conformant transactional repositories,
revisioned repositories which maintain data through PUT/POST/DELETE operations
or CRDT-repositories which interpret PATCH opertations to replicate and
reconcile data among multiple clients.

The library integrates an application data model with a remote store
by reconciling representations in three realms:

- web application data  
  represented as JavaScript objects   
  identified by a combination of instance identifier and application key values  
  described by JavaScript object properties, each of which binds either an atomic
    value, an object, or an array of such  
  combined into an active model which is associated with a revision  
  JavaScript proxy objects monitor access to instance propertiess and propagate
    them to the store  

- intermediate graphs  
  each a collection of triples  
  each captures the object property changes associated with a given application
    model transaction  
  a JSON-LD context governs the relation between terms and property values  
  each associated with a revision to enable undo/redo  

- persistent data  
  represented as a revisioned collection of RDF quads stored in a
    service repository  
  where the subject iri correspond to the application model instance identifier  
  the predicate arity is either one, for atomic values or higher for arrays  
  the object terms are either literals or subject iri of related resources  

The library concerns the application data, the intermediate
graph and communicating it to the remote RDF repository.
It is realized by three components in the client:

 - the GraphObject API
 - JavaScript / RDF mediation
 - the background remote request processing 

<pre>
        application API                         background requests  
    <-    GraphObject   ->               <- GraphStore + RDF GSP,SPARQL ->
    
    Object  -  field-cache  -  Graph  -  GSP/websockets  -  RDF-repository
    
                      JavaScript / RDF mediation  
              <---- Graph-Data-Model + RDFDatabase ----->
</pre>


### Application API

The application API supports the user interface data model. Its
implmentation comprises the files

    graph-object.js

It provides the abstract model class, GraphObject, which encapsulates
intances of specializations to track field modifications and record a delta
map for use by the store mediation
layer.
That relies on, in addition to the tracking logic, default
methods to transform the delta map into an abstract patch
according to instance state (clean, deleted, modified, new, etc.)
and on logic to manage declarations for managed properties

    GraphObject.prototype.asPatch[]()
    GraphObject.prototype.managedProperties()
    GraphObject.prototype.persistentProperties()
    GraphObject.prototype.transactionalProperties()
    
Should the application require other than the generic transformations,
it can override them as needed.
In connection with these, the respective concrete U/I classes must
They must also define respective static fields for

    _persistentProperties
    _transactionalProperties

to indicate which fields are to be managed.
These are coallesced for the respective concrete class, upon first use.

### JavaScript / RDF Mediation

The mediation layer implements the relation between the native JSON data
model and its representation as RDF. Its elements incorporate two layers:
absctract graph operations and RDF-specific implementations:

    graph-database.js
    RDF-database.js
    graph-environment.js
    RDF-environment.js

and includes the utility

    uuid-v1.js


At the mediation layer, the class GraphDatabase provides the means
for the application to realize persistence either by
[JDO-like](https://db.apache.org/jdo/) reachability or through
explicit store write operations. Either approach follows the pattern defined by
[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
([google](https://developers.google.com/web/ilt/pwa/working-with-indexeddb),
 [w3c](https://www.w3.org/TR/IndexedDB-2)),
in that a GDBTransaction provides the context for both implicitly
persistent model data manipulation and explicit store operations.

In order to propagate commits and accept remote notifications this relies on
RDFGraph instances and it, in turn, on RDFEnvironment  instances,
to perform un/marshalling between RDF graphs and JSON objects.

The mediation layer provides the operations

    GraphDatabase.objectStore
    GraphDatabase.transaction
    GDBObjectStore.put
    GDBObjectStore.get
    GDBObjectStore.delete
    GDBObjectStore.attach
    GDBObjectStore.detach
    GDBTransaction.abort
    GDBTransaction.commit
    GDBTransaction.objectStore

which implement the abstract mechanisms to bind instance to stores,
create transactions to govern changes and transform state changes onto
store requests upon transaction completion.




They rely on the RDF-specific implementation to 
implement RDF instance identifiers and IndexedDB key functions to govern the
relation between data model entities and their remote RDF representation.



The arguments to attach operations serve as roots to a reachability graph,
of which the objects are registered with the transaction's active ObjectStore.
When a transaction commits, this collection is examined and its field delta
maps are interpreted to generate GSP PATCH operations to propagate to the
remote replication service.
If a transaction aborts, then the maps are used to roll the object states back
view the method

    GraphObject.prototype.rollback

### Background Replication

The interaction with a remote RDF service for the actual data exchange
is accomplished by a background via Promises.
When either a transaction is committed explicitly or a chain of GDBObjectStore put
operations completes, the deferred phase transforms the abstract 
patch descriptions into a concrete GSP request and executes it on the remote 
service.

This is defined in 

    rdf-database.js

as concrete implemetations for the operators

    RDFDatabase.prototype.describe()
    RDFDatabase.prototype.head()
    RDFDatabase.prototype.get()
    RDFDatabase.prototype.patch()

which rely on the RDFEnvironment implementation for
     
    RDFEnvironment.prototype.createPatch()
    RDFEnvironment.prototype.createNamedNode()

and GSP/SPARQL implementation for

    GSP.get()
    GSP.head()
    GSP.patch()

The operations yielf IndexedDB Request results and completion
notification is through the onsuccess property.


### Background change notification

The application main thread receives changes from background websocket
listeners, which accept patch requests from the remote service.
These are translated back into property delta maps, which reference
attached GraphObject instances
and are passed to the application in the events

    GraphObject.prototype.oncreate
    GraphObject.prototype.onupdate
    GraphObject.prototype.ondelete

for those instances for it to examine and apply with the methods

    GraphObject.prototype.rollforward


