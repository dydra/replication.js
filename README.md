## dydra replication web client support

This JavaScript library implements a web client interface to the Dydra 
replication facility.
It mediates persistence for native JavaScript application and u/i data models
through web worker threads to a remote Dydra replication service via
GSP/websockets.
The remote service implements CRDT-repositories which reconcile and replicate
revisions among multiple clients.

The library realizes an application model which comprises multiple processes
and and their respective data:

- web application resources 
  represented as JavaScript objects   
  identified by a combination of subject iri and application key values  
  represented by JavaScript object fields each of which binds either an atomic
    value, an object, or an array of such
  combined into a model which is qualified by revision  

- intermediate graphs  
  each a collection of triples  
  each marshalls the object field changes associated with a given application
    model transaction  
  each associated with a revision to enable undo/redo  

- remote replicas  
  a collection of revisioned quads (that is, multiple graphs) stored in a
    service repository  
  the subject iri of which correspond to the application model subject iri  
  the predicate arity is either one, for atomic values or higher for arrays  
  the object terms are either literals or subject iri of related resources


The JavaScript implementation concerns the first two processes
and is realized by three components in the client:

 - the application API
 - JavaScript / RDF mediation
 - the background remote replication 


       application API                         background replication
    <- ReplicableObject ->               <---------- RDF-worker --------->
    
    Object  -  field-cache  -  Graph  -  GSP/websockets  -  RDF-repository
    
                      JavaScript / RDF mediation
               <---------- ReplicaDatabase ----------->


### Application API

The application API supports the user interface data model. Its
implmentation comprises the files

    replicated-object.js

It provides the abstract model class, ReplicatedObject, which encapsulates
specialization intances to track field modifications and record a delta
map for use by the RDF mediation layer.
In addition to the tracking logic, it provides default implementations for
the operators which support un/marshalling:

    ReplicableObject.RDFToObject
    ReplicableObject.ObjectToRDF

Should the application require other than the generic transformations,
it can override them as needed.


### JavaScript / RDF Mediation

The mediation layer implements the relation between the native JSON data
model and its representation as RDF. Its implementation comprises the files

    replica-database.js
    rdf-environment.js
    rdf-context.js
    rdf-graph.js

and includes the remote libraries

    json-ld.js
    rdflib.js

At the mediation layer, the class ReplicaDatabase provides a means
for the application to realize persistence either by
[JDO-like](https://db.apache.org/jdo/) reachability or through
explicit store write operations. Either approach follows the pattern defined by
[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
([google](https://developers.google.com/web/ilt/pwa/working-with-indexeddb),
 [w3c](https://www.w3.org/TR/IndexedDB-2)),
in that a ReplicaTransaction provides the context for both implicitly
persistent model data manipulation and explicit store operations.
In order to propagate commits and accept remote notifications this relies on
RDFGraph instances and it, in turn, on RDFEnvironment and RDFContext instances,
to perform un/marshalling between RDF graphs and JSON objects.

The mediation layer provides the operations

    ReplicaObjectStore.put
    ReplicaObjectStore.get
    ReplicaObjectStore.delete
    {ReplicaDatabase,ReplicaObjectStore}.attach
    {ReplicaDatabase,ReplicaObjectStore}.detach
    ReplicaObjectStore.transaction
    ReplicaTransaction.abort
    ReplicaTransaction.commit
    ReplicaTransaction.objectStore

In connection with these, the respective concrete U/I classes must
implement RDF instance identifiers and IndexedDB key functions to govern the
relation between data model entities and their remote RDF representation.
They must also define respective static fields for

    _persistentProperties
    _transactionalProperties

to indicate which fields are to be managed. These are coallesced for the
respective concrete class, upon first use.

The arguments to attach operations serve as roots to a reachability graph,
of which the objects are registered with the transaction's active ObjectStore.
When a transaction commits, this collection is examined and its field delta
maps are interpreted to generate GSP PATCH operations to propagate to the
remote replication service.
If a transaction aborts, then the maps are used to roll the object states back.

The application main thread also accepts messages from the background worker
through the mediation layer in the form of GSP PATCH operations.
These are translated into
the corresponding operation on the respective object to communicate changes to
the application and the U/I.
In order to handle these changes, the application's data model must implement
the methods

    ReplicatedObject.oncreate
    ReplicatedObject.onupdate
    ReplicatedObject.ondelete

### Background Replication

The communication with the remote RDF service for the actual data replication
is accomplished by a background
[web worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API).
Its implementation spans the files

    rdf-worker.js
    rdf-graph-store.js
    rdf-environment.js
    rdflib.js

The worker accepts onmessage instructions from the JavaScript main thread.
These specify [graph store protocol](https://www.w3.org/TR/2013/REC-sparql11-http-rdf-update-20130321/)
operations, most likely PATCH to effect implicit object persistence,
but also PUT and DELETE for blanket modifications.

The worker's websocket connection to the remote service also accepts remote
instructions in the form of GSP PATCH operations.
It communicates these as messages back to the main thread.

