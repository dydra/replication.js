var GraphCreator = null;

var testResults = {};

import { graphDatabase, graphObject, rdfDatabase, rdfEnvironment, GSP, SPARQL}
  from '../rdf-client.js';
//import {GSP, SPARQL} from '../rdf-graph-store.js';

class GraphUI {


  location() {
    return (document.getElementById('location').value); /*value="https://de8.dydra.com/jhacker/test" defined in .html*/
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
               {"authentication": authentication,
                "Accept": "application/sparql-results+json"},
      function(response) {
        // console.log("response ", response);
        response.text().then(function(text) {
          contentElement.value = text;
          var listElement = document.getElementById('entitylist');
          var json = JSON.parse(text);
          // console.log('json ', json);
          var bindings = json['results']['bindings'];
          listElement.innerHTML = '';
          bindings.forEach(function(solution) {
            var re = document.createElement('div');
            var id = solution['s']['value'];
            // console.log("addEventListener-", re, id);
            try { re.addEventListener('click', thisGraphUI.displaySelectedNodeByID, false);
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
               {"authentication": authentication,
                "Accept": "application/n-quads"},
      function(response) {
        response.text().then(function(text) {
          contentElement.value = text;
        });
      });
    }

    //GET-srx.sh
    //GET - count - tsv.sh
    //GET - count - srx.sh
    //GET - count - srj.sh -- DONE. 
    //GET - count - srj + srx.sh
    //GET - count - csv.sh -- ORIGINAL.
    //GET - construct - srx - 406.sh
    //GET - construct - rdfxml.sh
    //GET - anon - srj.sh


    //l$ cat GET-count - srj.sh
    //#! /bin/bash

    //curl_sparql_request \
    //-H "Accept: application/sparql-results+json" \
    //'query=select%20(count(*)%20as%20%3Fcount)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D' \
    //| jq '.results.bindings | .[].count.value' \
    //| fgrep - q '"1"'
    
    getEntitiesGET_count_srj_test() {
        const getEntitiesGET_count_srj_test_callback = function (response) {
            // console.log("response ", response);
            //const json = response.JSON;

            //response.text().then(function (text) {
            //    //contentElement.value = text;
            //    //var listElement = window.document.getElementById('entitylist');
            //    const json = JSON.parse(text);
            //    console.log('json ', json);
            //    console.log('json.results.bindings.length', json.results.bindings.length);
            //    //const bindings = json['results']['bindings'];
            //    return (json.results.bindings.length === 1);
            //});

            response.json().then(function (json) {
                console.log('json ', json);
                console.log('json.results.bindings.length', json.results.bindings.length);
                //const bindings = json['results']['bindings'];
                testResults["GET_count_srj_test"] = (json.results.bindings.length === 1);
            });

        }

        const location = this.location(); //same
        const authentication = this.authentication(); //same
        const uriEnc = 'select%20(count(*)%20as%20%3Fcount)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D';
        const uriDec = decodeURIComponent(uriEnc);

        SPARQL.get(location,
            uriDec,
            {
                "authentication": authentication,
                "Accept": "application/sparql-results+json"
            },
            getEntitiesGET_count_srj_test_callback
        );
        //
    }

    

    getEntitiesGET_count_srj() {
        const location = this.location(); //same
        const authentication = this.authentication(); //same
        var contentElement = window.document.getElementById('content'); //same
        var thisGraphUi = this; //same

        // var uri_enc = 'query=select%20(count(*)%20as%20%3Fcount)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D'; the query bit was left in; WRONG!
        const uriEnc = 'select%20(count(*)%20as%20%3Fcount)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D';
        const uriDec = decodeURIComponent(uriEnc);

        SPARQL.get(location,
            uriDec,
            {
                "authentication": authentication,
                "Accept": "application/sparql-results+json"
            },
            function (response) {
                // console.log("response ", response);
                response.text().then(function (text) {
                    contentElement.value = text;
                    var listElement = window.document.getElementById('entitylist');
                    const json = JSON.parse(text);

                    console.log('json ', json);
                    console.log('json.results.bindings.length', json.results.bindings.length);
                    const bindings = json['results']['bindings'];
                    listElement.innerHTML = '';
                    bindings.forEach(function (solution) {
                        const re = window.document.createElement('div');
                        const id = solution['s']['value'];
                        // console.log("addEventListener-", re, id);
                        try {
                            re.addEventListener('click', thisGraphUi.displaySelectedNodeByID, false);
                        } catch (error) {
                            console.log("addEventListener! ", error);
                        }
                        //console.log("addEventListener+");
                        re.appendChild(window.document.createTextNode(id));
                        listElement.appendChild(re);
                    });
                });
            }
        );
    }
}

function runSimpleGraph() {
// ReSharper disable once InconsistentNaming
  window.graphUI = new GraphUI();
  window.console.log("runSimpleGraph.GraphUI", window.graphUI);
  const gebi = document.getElementById('getEntities');
    const clickEventHandler = function(event) {
        window.console.log('getEntitiesGET_count_srj event', event);
      //window.graphUI.getEntitiesGET_count_srj(event);
      window.graphUI.getEntitiesGET_count_srj_test(event);
      //console.log('getEntities', event);
      //window.graphUI.getEntities(event);
  };
  gebi.addEventListener('click', clickEventHandler, false);
  gebi.addEventListener('touchstart', clickEventHandler, false);
};














(function() {
  var oldonload = window.onload;
  window.onload = function() {
    if (typeof oldonload == 'function') {
      oldonload(...arguments);
    }
    
    runSimpleGraph();
  }
}());


