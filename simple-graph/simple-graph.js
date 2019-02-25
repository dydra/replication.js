//var GraphCreator = null;

//var testResults = {};

//import { graphDatabase, graphObject, rdfDatabase, rdfEnvironment, GSP, SPARQL }
//    from '../rdf-client.js';

//class GraphUI {
    
//    location() {
//        return (window.document.getElementById('location').value);
//    }

//    authentication() {
//        return (window.document.getElementById('authentication').value);
//    }

//    getEntities() {
//        var location = this.location();
//        var authentication = this.authentication();
//        var contentElement = window.document.getElementById('content');
//        var thisGraphUI = this;
//        SPARQL.get(location,
//            "select distinct ?s where {?s a 'Node'}",
//            {
//                "authentication": authentication,
//                "Accept": "application/sparql-results+json"
//            },
//            function (response) {
//                // console.log("response ", response);
//                response.text().then(function (text) {
//                    contentElement.value = text;
//                    var listElement = window.document.getElementById('entitylist');
//                    var json = JSON.parse(text);
//                    // console.log('json ', json);
//                    var bindings = json['results']['bindings'];
//                    listElement.innerHTML = '';
//                    bindings.forEach(function (solution) {
//                        var re = window.document.createElement('div');
//                        var id = solution['s']['value'];
//                        // console.log("addEventListener-", re, id);
//                        try {
//                            re.addEventListener('click', thisGraphUI.displaySelectedNodeByID, false);
//                        } catch (error) {
//                            window.console.log("addEventListener! ", error);
//                        }
//                        //console.log("addEventListener+");
//                        re.appendChild(window.document.createTextNode(id));
//                        listElement.appendChild(re);
//                    });
//                });
//            }
//        );
//    }




//    displaySelectedNodeByID(event) {
//        var div = event.target;
//        var id = div.innerText;
//        var contentElement = window.document.getElementById('content');
//        contentElement.value = id;
//        window.graphUI.getNodeByID(id);
//    }

//    getNodeByID(id) {
//        var location = this.location();
//        var authentication = this.authentication();
//        var contentElement = window.document.getElementById('content');
//        var query = 'describe <' + id + '>';
//        window.console.log("getNodeByID.query ", query);
//        SPARQL.get(location,
//            query,
//            {
//                "authentication": authentication,
//                "Accept": "application/n-quads"
//            },
//            function (response) {
//                response.text().then(function (text) {
//                    contentElement.value = text;
//                });
//            });
//    }

//    //GET-srx.sh
//    //GET - count - tsv.sh
//    //GET - count - srx.sh
//    //GET - count - srj.sh -- DONE. 
//    //GET - count - srj + srx.sh -- DONE ++
//    //GET - count - csv.sh -- ORIGINAL.
//    //GET - construct - srx - 406.sh
//    //GET - construct - rdfxml.sh
//    //GET - anon - srj.sh




//    //generalized GET -- XML 
//    //TODO pass non-encoded URL as parameter for readability
//    GET_generalized_test_XML(getTestName, paramUriEnc, acceptHeader) {

//        const location = this.location(); //same
//        const authentication = this.authentication(); //same
//        const uriEnc = paramUriEnc;
//        const uriDec = decodeURIComponent(uriEnc);

//        const authKvp = {
//            "authentication": authentication,
//            "Accept": acceptHeader
//        };

//        const continuationGetXML = function (XML) {
//            //
//            window.console.log('json ', json);
//            window.console.log('json.results.bindings.length', json.results.bindings.length);
//            testResults[getTestName] = (json.results.bindings.length === 1);

//            //const parser = new DOMParser();
//            ////The parser creates a new XML DOM object using the text string:
//            //const xmlDoc = parser.parseFromString(XML, "text/xml");
//            //const x = xmlDoc.getElementsByTagName("literal datatype='http://www.w3.org/2001/XMLSchema#integer'");
//            //window.console.log('x: ', x);
        
//            debugger;
//        }

//        const getGeneralizedCallbackXML = function (response) {
//            //response.toJSON().then(continuationGetXML);
//            //console.log(response);
//            //response.text.then(continuationGetXML);
//            debugger;
//        }

        

//        SPARQL.get(location,
//            uriDec,
//            authKvp,
//            getGeneralizedCallbackXML
//        );
//    }

//    GET_count_srx_test() {
//        //curl_sparql_request - H "Accept: application/sparql-results+xml" 'query=select%20count(*)%20where%20%7b?s%20?p%20?o%7d' \
//        //| xmllint--c14n11 - \
//        //| tr - s '\t\n\r\f' ' ' | sed 's/ +/ /g' \
//        //| fgrep - i 'variable name="count1"' \
//        //| egrep - i - q - s '<binding name="count1">.*<literal .*>1</literal>'

//        //GET_test_name, paramUriEnc, acceptHeader
//        const getTestName1 = 'GET_count_srx_test';
//        const paramUriEnc1 = 'select%20count(*)%20where%20%7b?s%20?p%20?o%7d';
//        const acceptHeader1 = 'application/sparql-results+xml';
//        this.GET_generalized_test_XML(getTestName1, paramUriEnc1, acceptHeader1);

//    }

//    //generalized GET -- json
//    //TODO pass non-encoded URL as parameter for readability
//    GET_generalized_test(getTestName, paramUriEnc, acceptHeader) {
//        const continuationGet = function (json) {
//            window.console.log('json ', json);
//            window.console.log('json.results.bindings.length', json.results.bindings.length);
//            testResults[getTestName] = (json.results.bindings.length === 1);
//            debugger;
//        }

//        const getGeneralizedCallback = function (response) {
//            response.json().then(continuationGet);
//        }

//        const location = this.location(); //same
//        const authentication = this.authentication(); //same
//        const uriEnc = paramUriEnc;
//        const uriDec = decodeURIComponent(uriEnc);

//        const authKvp = {
//            "authentication": authentication,
//            "Accept": acceptHeader
//        };

//        SPARQL.get(location,
//            uriDec,
//            authKvp,
//            getGeneralizedCallback
//        );
//    }


//    //#! /bin/bash
//    //# verify the accept order is observed
//    //curl_sparql_request \
//    //-H 'Accept: application/sparql-results+json,application/sparql-results+xml,*/*;q=0.9' \
//    //'query=select%20count(*)%20where%20%7b?s%20?p%20?o%7d' \
//    //| jq '.results.bindings[] | .[].value' | fgrep - q '"1"'

//    GET_count_srj_plus_srx_test() {
//        const continuationGet = function (json) {
//            window.console.log('json ', json);
//            window.console.log('json.results.bindings.length', json.results.bindings.length);
//            testResults["GET_count_srj_plus_srx_test"] = (json.results.bindings.length === 1);
//            debugger;
//        }

//        const getCountSrjPlusSrxTestCallback = function (response) {
//            response.json().then(continuationGet);
//        }

//        const location = this.location(); //same
//        const authentication = this.authentication(); //same
//        const uriEnc = 'select%20count(*)%20where%20%7b?s%20?p%20?o%7d';
//        const uriDec = decodeURIComponent(uriEnc);

//        const authKvp = {
//            "authentication": authentication,
//            "Accept": "application/sparql-results+json,application/sparql-results+xml,*/*;q=0.9"
//        };

//        SPARQL.get(location,
//            uriDec,
//            authKvp,
//            getCountSrjPlusSrxTestCallback
//        );
//    }

//    //l$ cat GET-count - srj.sh
//    //#! /bin/bash
//    //curl_sparql_request \
//    //-H "Accept: application/sparql-results+json" \
//    //'query=select%20(count(*)%20as%20%3Fcount)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D' \
//    //| jq '.results.bindings | .[].count.value' \
//    //| fgrep - q '"1"'


//    GET_count_srj_test() {
//        const continuationGet = function (json) {
//            window.console.log('json ', json);
//            window.console.log('json.results.bindings.length', json.results.bindings.length);
//            testResults["GET_count_srj_test"] = (json.results.bindings.length === 1);
//            debugger;
//        }

//        const getEntitiesGetCountSrjTestCallback = function (response) {
//            response.json().then(continuationGet);
//        }

//        const location = this.location(); //same
//        const authentication = this.authentication(); //same
//        const uriEnc = 'select%20(count(*)%20as%20%3Fcount)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D';
//        const uriDec = decodeURIComponent(uriEnc);

//        const authKvp = {
//            "authentication": authentication,
//            "Accept": "application/sparql-results+json"
//        };

//        SPARQL.get(location,
//            uriDec,
//            authKvp,
//            getEntitiesGetCountSrjTestCallback
//        );
//    }



////    getEntitiesGET_count_srj() {
////        const location = this.location(); //same
////        const authentication = this.authentication(); //same
////        var contentElement = window.document.getElementById('content'); //same
////        var thisGraphUi = this; //same

////        // var uri_enc = 'query=select%20(count(*)%20as%20%3Fcount)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D'; the query bit was left in; WRONG!
////        const uriEnc = 'select%20(count(*)%20as%20%3Fcount)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D';
////        const uriDec = decodeURIComponent(uriEnc);

////        SPARQL.get(location,
////            uriDec,
////            {
////                "authentication": authentication,
////                "Accept": "application/sparql-results+json"
////            },
////            function (response) {
////                // console.log("response ", response);
////                response.text().then(function (text) {
////                    contentElement.value = text;
////                    var listElement = window.document.getElementById('entitylist');
////                    const json = JSON.parse(text);

////                    window.console.log('json ', json);
////                    window.console.log('json.results.bindings.length', json.results.bindings.length);
////                    const bindings = json['results']['bindings'];
////                    listElement.innerHTML = '';
////                    bindings.forEach(function (solution) {
////                        const re = window.document.createElement('div');
////                        const id = solution['s']['value'];
////                        // console.log("addEventListener-", re, id);
////                        try {
////                            re.addEventListener('click', thisGraphUi.displaySelectedNodeByID, false);
////                        } catch (error) {
////                            window.console.log("addEventListener! ", error);
////                        }
////                        //console.log("addEventListener+");
////                        re.appendChild(window.document.createTextNode(id));
////                        listElement.appendChild(re);
////                    });
////                });
////            }
////        );
////    }
////}

//function runSimpleGraph() {
//    // ReSharper disable once InconsistentNaming
//    window.graphUI = new GraphUI();
//    window.console.log("runSimpleGraph.GraphUI", window.graphUI);
//    const gebi = window.document.getElementById('getEntities');
//    const clickEventHandler = function (event) {
//        window.console.log('getEntitiesGET_count_srj event', event);
//        //window.graphUI.getEntitiesGET_count_srj(event);

//        //window.graphUI.GET_count_srj_test(event);
//        //window.graphUI.GET_count_srj_plus_srx_test(event);
//        window.graphUI.GET_count_srx_test(event);

//        //console.log('getEntities', event);
//        //window.graphUI.getEntities(event);
//    };
//    gebi.addEventListener('click', clickEventHandler, false);
//    gebi.addEventListener('touchstart', clickEventHandler, false);
//};














//(function () {
//    var oldonload = window.onload;
//    window.onload = function () {
//        if (typeof oldonload == 'function') {
//            oldonload(...arguments);
//        }

//        runSimpleGraph();
//    }
//}());


