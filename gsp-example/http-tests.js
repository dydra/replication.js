
export { HTTP_API_GET_Tests };

import { DOM_update } from './global-functions.js'

class HTTP_API_GET_Tests {

    constructor(location, authentication) {
        this.location = location;
        this.authentication = authentication; 
    }

    //generalized GET -- json
    //TODO pass non-encoded URL as parameter for readability
    GET_generalized_test(getTestName, paramUriEnc, acceptHeader) {
        

        const continuationGet = function (json) {
            window.console.log('json ', json);
            window.console.log('json.results.bindings.length', json.results.bindings.length);

            const testResult = json.results.bindings.length == 1;
            DOM_update(getTestName, testResult);

        }

        const getGeneralizedCallback = function (response) {
            response.json().then(continuationGet);
        }

        const uriEnc = paramUriEnc;
        const uriDec = decodeURIComponent(uriEnc);

        const authKvp = {
            "authentication": this.authentication,
            "Accept": acceptHeader
        };

        SPARQL.get(this.location,
            uriDec,
            authKvp,
            getGeneralizedCallback
        );
}


    //#! /bin/bash
    //# verify the accept order is observed
    //curl_sparql_request \
    //-H 'Accept: application/sparql-results+json,application/sparql-results+xml,*/*;q=0.9' \
    //'query=select%20count(*)%20where%20%7b?s%20?p%20?o%7d' \
    //| jq '.results.bindings[] | .[].value' | fgrep - q '"1"'

    GET_count_srj_plus_srx_test() {
        const testName = 'GET_count_srj_plus_srx_test';
        const paramUriEnc = 'select%20count(*)%20where%20%7b?s%20?p%20?o%7d';
        const acceptHeader = 'application/sparql-results+json,application/sparql-results+xml,*/*;q=0.9';

        this.GET_generalized_test(
            testName,
            paramUriEnc,
            acceptHeader);
    }


    //curl_sparql_request \
    //-H "Accept: application/sparql-results+json" \
    //'query=select%20(count(*)%20as%20%3Fcount)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D' \
    //| jq '.results.bindings | .[].count.value' \
    //| fgrep - q '"1"'

    GET_count_srj_test() {

        const testName = 'GET_count_srj_test';
        const paramUriEnc = 'select%20(count(*)%20as%20%3Fcount)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D';
        const acceptHeader = 'application/sparql-results+json';

        this.GET_generalized_test(
            testName,
            paramUriEnc,
            acceptHeader);

    }




    //generalized GET -- XML 
    //TODO pass non-encoded URL as parameter for readability
    GET_generalized_test_XML(getTestName, paramUri, acceptHeader) {

        const location = graphUI.location(); //same
        const authentication = graphUI.authentication(); //same
        
        const authKvp = {
            "authentication": authentication,
            "Accept": acceptHeader
        };

        const continuationGetXML = function (XML) {
            //window.console.log('XML: ', XML);

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(XML, "text/xml");
            const x = xmlDoc.getElementsByTagName(
                "literal")[0].childNodes[0].nodeValue;

            window.console.log('x: ', xmlDoc);
            window.console.log('x: ', x);
            //debugger;
        }

        const getGeneralizedCallbackXML = function (response) {
            response.text().then(continuationGetXML);
        }

        SPARQL.get(location,
            paramUri,
            authKvp,
            getGeneralizedCallbackXML
        );
    }

    GET_count_srx_test() {
        //curl_sparql_request - H "Accept: application/sparql-results+xml" 'query=select%20count(*)%20where%20%7b?s%20?p%20?o%7d' \
        //| xmllint--c14n11 - \
        //| tr - s '\t\n\r\f' ' ' | sed 's/ +/ /g' \
        //| fgrep - i 'variable name="count1"' \
        //| egrep - i - q - s '<binding name="count1">.*<literal .*>1</literal>'

        const getTestName1 = 'GET_count_srx_test';
        const paramUri1 = 'select count(*) where {?s ?p ?o}';
        const acceptHeader1 = 'application/sparql-results+xml';
        this.GET_generalized_test_XML(getTestName1, paramUri1, acceptHeader1);

    }

    //TODO needs refactor, Copypaste from prev.
    GET_count_tsv_test() {
        //#! /bin/bash

        //curl_sparql_request - H "Accept: text/tab-separated-values" 'query=select%20count(*)%20where%20%7b?s%20?p%20?o%7d' \
        //| tr - s '\n' '\t' \
        //| egrep - q - s 'COUNT1.*1'

        const getTestName1 = 'GET_count_tsv_test';
        const paramUri1 = 'select%20count(*)%20where%20%7b?s%20?p%20?o%7d';
        const acceptHeader1 = 'text/tab-separated-values';

        const continuationGetTSV = function (response) {
            const testResult = /COUNT1\n\"1"/i.test(response);
            DOM_update(getTestName1, testResult);
        }
        
        const getGeneralizedCallback = function (response) {
            window.console.log(response.text);
            response.text().then(continuationGetTSV);
        }

        const uriEnc = paramUri1;
        const uriDec = decodeURIComponent(uriEnc);

        const authKvp = {
            "authentication": this.authentication,
            "Accept": acceptHeader1
        };

        SPARQL.get(this.location,
            uriDec,
            authKvp,
            getGeneralizedCallback
        );

    }


    GET_srx() {
        //#! /bin/bash

        //curl_sparql_request \
        //    -H "Accept: application/sparql-results+xml" \
        //'query=select%20(count(*)%20as%20%3Fcount1)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D' \
        //    | xmllint--c14n11 - \
        //    | tr - s '\t\n\r\f' ' ' | sed 's/ +/ /g' | sed 's/></> </g' \
        //    | fgrep 'variable name="count1"' \
        //    | egrep - q - s '<binding name="count1"> <literal .*>1</literal>'


        const getTestName1 = 'GET_srx';
        const paramUri1 = 'select%20(count(*)%20as%20%3Fcount1)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D';
        const acceptHeader1 = 'application/sparql-results+xml';

        const uriEnc = paramUri1;
        const uriDec = decodeURIComponent(uriEnc);

        const authKvp = {
            "authentication": this.authentication,
            "Accept": acceptHeader1
        };

        const continuationGetSRX = function (XML) {

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(XML, "text/xml");
            const x = xmlDoc.getElementsByTagName(
                "literal")[0].childNodes[0].nodeValue;

            window.console.log('x: ', xmlDoc);
            window.console.log('x: ', x);

            const testResult = xmlDoc.getElementsByTagName(
                    "literal")[0].childNodes[0].nodeValue ==
                1;
                ///COUNT1\n\"1"/i.test(response);
            DOM_update(getTestName1, testResult);
            //debugger;
        }

        const getSRXCallback = function (response) {
            window.console.log(response.text);
            response.text().then(continuationGetSRX);
        }

        SPARQL.get(this.location,
            uriDec,
            authKvp,
            getSRXCallback
        );


    }

    GET_anon_srj() {
        //#! /bin/bash

        //curl_sparql_request--repository "$STORE_REPOSITORY_PUBLIC" \
        //    -H "Accept: application/sparql-results+json" \
        //'query=select%20count(*)%20where%20%7bgraph%20?g%20%7b?s%20?p%20?o%7d%7d' \
        //    | jq '.results.bindings[] | .[].datatype' | fgrep - q 'integer'

        const getTestName1 = 'GET_anon_srj';
        const paramUri1 = 'select%20count(*)%20where%20%7bgraph%20?g%20%7b?s%20?p%20?o%7d%7d';
        const acceptHeader1 = 'application/sparql-results+json';

        //GET_generalized_test()
        const location_temp = this.location; 
        // comes from define.sh 
        // export STORE_REPOSITORY_PUBLIC = "public"
        const host = "https://test.dydra.com";
        const user = "openrdf-sesame";
        const repo = "public";
        const location_public = host + "/" + user + "/" + repo;
        this.location = location_public;
        this.GET_generalized_test(
            getTestName1,
            paramUri1,
            acceptHeader1);

        this.location = location_temp ; //restore value so that the object can be reused 
    }

    GET_construct_srx_406() {
        //#! /bin/bash

        //# sparql results for a construct should return a 406

        //curl_sparql_request - w "%{http_code}\n" \
        //    -H "Accept: application/sparql-results+xml" \
        //'query=construct%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20where%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20' \
        //    | test_not_acceptable_success

        
        const getTestName1 = 'GET_construct_srx_406';
        //TODO can I use introspection to find this function name? (one less parameter to set)
        const paramUri1 = 'construct%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20where%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20';
        const acceptHeader1 = 'application/sparql-results+xml';

        const uriEnc = paramUri1;
        const uriDec = decodeURIComponent(uriEnc);

        const authKvp = {
            "authentication": this.authentication,
            "Accept": acceptHeader1
        };

        SPARQL.get(this.location,
            uriDec,
            authKvp,
            function(response) {
                const testResult = (response.status == 406);
                debugger;
                //TODO update DOM and return testResult
            }
        );

    }

    GET_construct_rdfxml() {
        //#! /bin/bash

        //curl_sparql_request \
        //    -H "Accept: application/rdf+xml" \
        //'query=construct%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20where%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20' \
        //    | rapper - q--input rdfxml--output nquads / dev / stdin - \
        //    | fgrep - q "default object"

        const getTestName1 = 'GET_construct_rdfxml';
        //TODO can I use introspection to find this function name? (one less parameter to set)
        const paramUri1 = 'construct%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20where%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20';
        const acceptHeader1 = 'application/rdf+xml';

        const uriEnc = paramUri1;
        const uriDec = decodeURIComponent(uriEnc);

        const authKvp = {
            "authentication": this.authentication,
            "Accept": acceptHeader1
        };

        const continuationGetXML = function (XML) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(XML, "text/xml");
            const x = xmlDoc.getElementsByTagName("rdf:Description")[0].childNodes[0].firstChild;

            const testResult = (x.data == "default object");

            window.console.log('x: ', xmlDoc);
            window.console.log('x: ', x);
            
        }

        const getGeneralizedCallbackXML = function (response) {
            response.text().then(continuationGetXML);
        }

        SPARQL.get(this.location,
            uriDec,
            authKvp,
            getGeneralizedCallbackXML);

    }


    RunAll() {
        this.GET_construct_srx_406();
        this.GET_construct_rdfxml();

        this.GET_srx();
        this.GET_anon_srj();

        this.GET_count_tsv_test();   
        this.GET_count_srx_test();
        this.GET_count_srj_test();
        this.GET_count_srj_plus_srx_test();


    }









































































        //const continuationGet = function (json) {
        //    window.console.log('json ', json);
        //    window.console.log('json.results.bindings.length', json.results.bindings.length);
        //    testResults["GET_count_srj_test"] = (json.results.bindings.length === 1);
        //    //debugger;
        //}

        //const getEntitiesGetCountSrjTestCallback = function (response) {
        //    response.json().then(continuationGet);
        //}

        //const location = this.location; //same
        //const authentication = this.authentication; //same
        //const uriEnc = 'select%20(count(*)%20as%20%3Fcount)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D';
        //const uriDec = decodeURIComponent(uriEnc);

        //const authKvp = {
        //    "authentication": authentication,
        //    "Accept": "application/sparql-results+json"
        //};

        //SPARQL.get(location,
        //    uriDec,
        //    authKvp,
        //    getEntitiesGetCountSrjTestCallback
        //);
    //}



    //getEntitiesGET_count_srj() {
    //    const location = this.location;
    //    const authentication = this.authentication;
    //    var contentElement = window.document.getElementById('content'); 
    //    var thisGraphUi = window.graphUI;

    //    const uriEnc = 'select%20(count(*)%20as%20%3Fcount)%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D';
    //    const uriDec = decodeURIComponent(uriEnc);

    //    SPARQL.get(location,
    //        uriDec,
    //        {
    //            "authentication": authentication,
    //            "Accept": "application/sparql-results+json"
    //        },
    //        function (response) {
    //            // console.log("response ", response);
    //            response.text().then(function (text) {
    //                contentElement.value = text;
    //                var listElement = window.document.getElementById('entitylist');
    //                const json = JSON.parse(text);

    //                window.console.log('json ', json);
    //                window.console.log('json.results.bindings.length', json.results.bindings.length);
    //                const bindings = json['results']['bindings'];
    //                listElement.innerHTML = '';
    //                bindings.forEach(function (solution) {
    //                    const re = window.document.createElement('div');
    //                    const id = solution['s']['value'];
    //                    // console.log("addEventListener-", re, id);
    //                    try {
    //                        re.addEventListener('click', thisGraphUi.displaySelectedNodeByID, false);
    //                    } catch (error) {
    //                        window.console.log("addEventListener! ", error);
    //                    }
    //                    //console.log("addEventListener+");
    //                    re.appendChild(window.document.createTextNode(id));
    //                    listElement.appendChild(re);
    //                });
    //            });
    //        }
    //    );
    //}



}