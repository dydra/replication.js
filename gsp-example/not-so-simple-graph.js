var GraphCreator = null;

var testResults = {};

import { graphDatabase, graphObject, rdfDatabase, rdfEnvironment, GSP, SPARQL }
    from '../rdf-client.js';

import { HTTP_API_GET_Tests } from './http-tests.js';
import { HTTP_API_POST_Tests } from './http-post-tests.js';

class GraphUI {


    location() {
        return (window.document.getElementById('location').value
        ); /*value="https://de8.dydra.com/jhacker/test" defined in .html*/
    }

    authentication() {
        return (window.document.getElementById('authentication').value);
    }

    getEntities() {
        var location = this.location();
        var authentication = this.authentication();
        var contentElement = window.document.getElementById('content');
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
                    var listElement = window.document.getElementById('entitylist');
                    var json = JSON.parse(text);
                    // console.log('json ', json);
                    var bindings = json['results']['bindings'];
                    listElement.innerHTML = '';
                    bindings.forEach(function (solution) {
                        var re = window.document.createElement('div');
                        var id = solution['s']['value'];
                        // console.log("addEventListener-", re, id);
                        try {
                            re.addEventListener('click', thisGraphUI.displaySelectedNodeByID, false);
                        } catch (error) {
                            window.console.log("addEventListener! ", error);
                        }
                        //console.log("addEventListener+");
                        re.appendChild(window.document.createTextNode(id));
                        listElement.appendChild(re);
                    });
                });
            }
        );
    }


    displaySelectedNodeByID(event) {
        var div = event.target;
        var id = div.innerText;
        var contentElement = window.document.getElementById('content');
        contentElement.value = id;
        window.graphUI.getNodeByID(id);
    }

    getNodeByID(id) {
        var location = this.location();
        var authentication = this.authentication();
        var contentElement = window.document.getElementById('content');
        var query = 'describe <' + id + '>';
        window.console.log("getNodeByID.query ", query);
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
    // ReSharper disable once InconsistentNaming
    window.graphUI = new GraphUI();
    window.console.log("runSimpleGraph.GraphUI", window.graphUI);
    
    const gebi = window.document.getElementById('getEntities');
    const clickEventHandler = function (event) {
        window.console.log('getEntities', event);
        window.graphUI.getEntities(event);
    };
    //gebi.addEventListener('click', clickEventHandler, false);
    //gebi.addEventListener('touchstart', clickEventHandler, false);

    //window.httpTests = new HTTP_API_Tests(window.graphUI.location(), window.graphUI.authentication());
    const host = "https://test.dydra.com";
    const user = "openrdf-sesame";
    const repo = "mem-rdf";
    const location = host + "/" + user + "/" + repo;
    //window.httpTests = new HTTP_API_Tests(location, "YtGwUWq1kY7nAL1ocIvl");
    //window.httpTests.RunAll();
    window.httpPostTests = new HTTP_API_POST_Tests(location, "YtGwUWq1kY7nAL1ocIvl");
    window.httpPostTests.RunAll();


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


