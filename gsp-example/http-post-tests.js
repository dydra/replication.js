export { HTTP_API_POST_Tests };
import { print_r } from './var_dump.js';

import { DOM_update } from './global-functions.js'

class HTTP_API_POST_Tests {

    constructor(location, authentication) {
        this.location = location;
        this.authentication = authentication;
    }


    //sparql-protocol / POST - update - srj.sh
    //sparql - protocol / POST - tsv.sh
    //sparql - protocol / POST - srj.sh
    //sparql - protocol / POST - move - graph.sh
    //sparql - protocol / POST - csv.sh
    //sparql - protocol / POST - count - srx.sh





    POST_update_srj_test() {
//POST - update - srj.sh
//    #! /bin/bash

//    curl_sparql_request \
//    -H "Accept: application/sparql-results+json" \
//    -H "Content-Type: application/sparql-update" \
//    --repository "${STORE_REPOSITORY_WRITABLE}" << EOF \
//    | jq '.boolean' | fgrep - q 'true'
//    PREFIX: <http://example.org/>
//    INSERT { GRAPH : g2 { ? s ? p 'r' } } WHERE { ?s ? p ? o }
        //EOF

    }


    //POST_generalized_test(
    //testName,
    //paramUriEnc,
    //acceptHeader) {

    //    const DOM_update = function (testname, result) {
    //        var ul = document.getElementById("testResults");
    //        var li = document.createElement("li");
    //        li.appendChild(document.createTextNode(testname + " : " + result));
    //        ul.appendChild(li);
    //    }

    //    const continuationGetTSV = function (response) {
    //        const testResult = /COUNT1\n\"1"/i.test(response);
    //        DOM_update(getTestName1, testResult);
    //    }

    //    const getGeneralizedCallback = function (response) {
    //        window.console.log(response.text);
    //        response.text().then(continuationGetTSV);
    //    }

    //    const uriEnc = paramUri1;
    //    const uriDec = decodeURIComponent(uriEnc);

    //    const authKvp = {
    //        "authentication": this.authentication,
    //        "Accept": acceptHeader1
    //    };

    //    SPARQL.post(this.location
    //    ,uriDec,
    //    //    authKvp,
    //    //    getGeneralizedCallback
    //    //);

    //}

    POST_count_tsv_test() {
        //#! /bin/bash
        //# check text / tab - separated - values

        //curl_sparql_request \
        //    -H "Content-Type: application/x-www-form-urlencoded" \
        //    -H "Accept: text/tab-separated-values" << EOF \
        //    | tr '\n' ' ' | fgrep integer | fgrep - qi 'count'
        //query = select % 20(count(*) % 20 as% 20 ? count) % 20where % 20 % 7b ? s % 20 ? p % 20 ? o % 7d
        //    EOF

        const testName1 = 'POST_tsv_test';
        const paramUriEnc1 = 'query=select%20(count(*)%20as%20?count)%20where%20%7b?s%20?p%20?o%7d';
        const acceptHeader1 = 'text/tab-separated-values';
        const contentType1 = "application/x-www-form-urlencoded";

        const optionsParam = {
            ["Content-Type"]: contentType1,
            ["Accept"]: acceptHeader1
        };

        const continuationGetTSV = function (response) {
            const testResult = /count\n\"1"/i.test(response);
            DOM_update(testName1, testResult);
        }

        const tsvTestContinuation = function (response) {
            window.console.log(response.text);
            response.text().then(continuationGetTSV);
        }
 
        SPARQL.post(this.location, paramUriEnc1, optionsParam, tsvTestContinuation);


    }

    POST_srj_test() {
        //#! /bin/bash
        //# check url encoding
        //# check various graph parameters

        //curl_sparql_request \
        //    -H "Content-Type: application/x-www-form-urlencoded" \
        //    -H "Accept: application/sparql-results+json" << EOF \
        //    | jq '.results.bindings[] | .[].value' | fgrep - q '"1"'
        //query = select % 20count(*) % 20where % 20 % 7b ? s % 20 ? p % 20 ? o % 7d
        //    EOF

        //    curl_sparql_request default -graph - uri=urn: dydra:default \
        //    -H "Content-Type: application/sparql-query" \
        //    -H "Accept: application/sparql-results+json" << EOF \
        //    | jq '.results.bindings[] | .[].value' | fgrep - q 'default'
        //select * where { ?s ? p ? o }
        //EOF


        //curl_sparql_request  default -graph - uri=urn: dydra: all \
        //    -H "Content-Type: application/sparql-query" \
        //    -H "Accept: application/sparql-results+json" << EOF \
        //    | jq '.results.bindings[] | .[].value' | fgrep - q 'named'
        //select * where { ?s ? p ? o }
        //EOF

        //curl_sparql_request  default -graph - uri=urn: dydra: named\
        //    -H "Content-Type: application/sparql-query" \
        //    -H "Accept: application/sparql-results+json" << EOF \
        //    | jq '.results.bindings[] | .[].value' | fgrep - q - v 'default'
        //select * where { ?s ? p ? o }
        //EOF

    }

    POST_move_graph_test() {
        //#! /bin/bash

        //initialize_repository--repository "${STORE_REPOSITORY}-write"
        //# curl_graph_store_get--repository "${STORE_REPOSITORY}-write"


        //curl_sparql_request \
        //    -H "Accept: application/sparql-results+json" \
        //    -H "Content-Type: application/sparql-update" \
        //--repository "${STORE_REPOSITORY}-write" << EOF \
        //    | jq '.boolean' | fgrep - q 'true'
        //move < http://dydra.com/openrdf-sesame/mem-rdf/graph-name>
        //to < http://dydra.com/openrdf-sesame/mem-rdf/graph-name-moved>
        //EOF

        //curl_sparql_request \
        //    -H "Content-Type: application/sparql-query" \
        //    -H "Accept: application/sparql-results+json" \
        //--repository "${STORE_REPOSITORY}-write" << EOF \
        //    | jq '.results.bindings[] | .[].value' | fgrep - q "name-moved"
        //select ? g where { graph ? g { ?s ? p ? o } }
        //EOF


    }

    POST_csv_test() {
        //#! /bin/bash
        //# check text / csv

        //curl_sparql_request \
        //    -H "Content-Type: application/x-www-form-urlencoded" \
        //    -H "Accept: text/csv" << EOF \
        //    | tr '\n' ' ' | egrep - e '[[:digit:]]' | fgrep - qi 'count'
        //query = select % 20(count(*) % 20 as% 20 ? count) % 20where % 20 % 7b ? s % 20 ? p % 20 ? o % 7d
        //    EOF


    }

    POST_count_srx_test() {
        //#! /bin/bash


        //curl_sparql_request \
        //    -H "Content-Type: application/x-www-form-urlencoded" \
        //    -H "Accept: application/sparql-results+xml" << EOF \
        //    | xmllint--c14n11 - \
        //    | tr - s '\t\n\r\f' ' ' | sed 's/ +/ /g' \
        //    | fgrep - i 'variable name="count1"' \
        //    | egrep - i - q - s '<binding name="count1">.*<literal .*>1</literal>'
        //query = select % 20count(*) % 20where % 20 % 7b ? s % 20 ? p % 20 ? o % 7d
        //    EOF

        const testName1 = 'POST_count_srx_test';
        const paramUriEnc1 = 'query=select%20count(*)%20where%20%7b?s%20?p%20?o%7d';
        const acceptHeader1 = 'application/sparql-results+xml';
        const contentType1 = "application/x-www-form-urlencoded";

        const optionsParam = {
            ["Content-Type"]: contentType1,
            ["Accept"]: acceptHeader1
        };

        const continuationGetTSV = function (response) {
            const testResult = /count\n\"1"/i.test(response);
            DOM_update(testName1, testResult);
        }

        const tsvTestContinuation = function (response) {
            window.console.log(response.text);
            response.text().then(continuationGetTSV);
        }

        SPARQL.post(this.location, paramUriEnc1, optionsParam, tsvTestContinuation);


    }

    RunAll() {
      
        this.POST_count_tsv_test();
        this.POST_count_srx_test();

        this.POST_update_srj_test();

        this.POST_srj_test();

        this.POST_move_graph_test();

        this.POST_csv_test();

        
        

    }


}
