var GraphCreator = null;

import { graphDatabase, graphObject, rdfDatabase, rdfEnvironment, GSP, SPARQL }
    from '../rdf-client.js';
//import {GSP, SPARQL} from '../rdf-graph-store.js';

class GraphUI {

    location() {
        return (document.getElementById('location').value);
    }

    authentication() {
        return (document.getElementById('authentication').value);
    }

    getEntities() {
        var location = this.location();
        var authentication = this.authentication();
        var contentElement = document.getElementById('content');
        var thisGraphUI = this;
        SPARQL.get(location,
            "select distinct ?s where {?s a 'Node'}",
            {
                "authentication": authentication,
                "Accept": "application/sparql-results+json"
            },
            function (response) {
                // console.log("response ", response);
                response.text().then(function (text) {
                    contentElement.value = text;
                    var listElement = document.getElementById('entitylist');
                    var json = JSON.parse(text);
                    // console.log('json ', json);
                    var bindings = json['results']['bindings'];
                    listElement.innerHTML = '';
                    bindings.forEach(function (solution) {
                        var re = document.createElement('div');
                        var id = solution['s']['value'];
                        // console.log("addEventListener-", re, id);
                        try {
                            re.addEventListener('click', thisGraphUI.displaySelectedNodeByID, false);
                        } catch (error) {
                            console.log("addEventListener! ", error);
                        }
                        //console.log("addEventListener+");
                        re.appendChild(document.createTextNode(id));
                        listElement.appendChild(re);
                    });
                });
            }
        );
    }

    displaySelectedNodeByID(event) {
        var div = event.target;
        var id = div.innerText;
        var contentElement = document.getElementById('content');
        contentElement.value = id;
        window.graphUI.getNodeByID(id);
    }

    getNodeByID(id) {
        var location = this.location();
        var authentication = this.authentication();
        var contentElement = document.getElementById('content');
        var query = 'describe <' + id + '>';
        console.log("getNodeByID.query ", query);
        SPARQL.get(location,
            query,
            {
                "authentication": authentication,
                "Accept": "application/n-quads"
            },
            function (response) {
                response.text().then(function (text) {
                    contentElement.value = text;
                });
            });
    }
}

function runSimpleGraph() {
    window.graphUI = new GraphUI();
    console.log("runSimpleGraph.GraphUI", window.graphUI);
    var gebi = document.getElementById('getEntities');
    var clickEventHandler = function (event) {
        // console.log('getEntitites event', event);
        window.graphUI.getEntities(event);
    };
    gebi.addEventListener('click', clickEventHandler, false);
    gebi.addEventListener('touchstart', clickEventHandler, false);
};


(function () {
    var oldonload = window.onload;
    window.onload = function () {
        if (typeof oldonload == 'function') {
            oldonload(...arguments);
        }

        runSimpleGraph();
    }
}());


