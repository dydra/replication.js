var GraphCreator = null;

import { graphDatabase, graphObject, rdfDatabase, rdfEnvironment}
  from '../rdf-client.js';
import {GSP, SPARQL} from '../rdf-graph-store.js';

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
            re.onclick = function(element) {
              contentElement.value = id;
              thisGraphUI.getNode(id);
            };
            re.appendChild(document.createTextNode(id));
            listElement.appendChild(re);
          });
        });
      }
    );
  }

  getNode(id) {
    var location = this.location();
    var authentication = this.authentication();
    var contentElement = document.getElementById('content');
    var query = 'describe <' + id + '>';
    console.log("query ", query);
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
}

function runSimpleGraph() {
  window.graphUI = new GraphUI();
  console.log("GraphUI", window.graphUI);
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


