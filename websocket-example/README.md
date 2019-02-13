rdf-graph-creator
=================

A variation on the d3.js interactive tool for creating directed graphs, which
saves the graph with a remote RDF service.


Demo: http://bl.ocks.org/cjrd/6863459

<p align="center">
<img src="http://obphio.us/media/images/digraph-creator.png" alt="Metacademy Logo" height="350px"/>
</p>

Operation:

* specify the generic RDF service endpoint location (nett of /service or /sparql)
* add basic requisite authentication information

* drag/scroll to translate/zoom the graph
* shift-click on graph to create a node
* shift-click on a node and then drag to another node to connect them with a directed edge
* shift-click on a node to change its title
* click on node or edge and press backspace/delete to delete

Run:

* `python -m SimpleHTTPServer 8000`
* navigate to http://127.0.0.1:8000

The Github repo is at https://github.com/dydra/replication
based on https://github.com/metacademy/directed-graph-creator.
A diff between the original graph-creator.js and the
rdf-graph-creator.js variation indicates the changes which implement
RDF-based persistence

License: MIT/X








