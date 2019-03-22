//POST_srj_test_sub2() {

//    //    curl_sparql_request default -graph - uri=urn: dydra:default \
//    //    -H "Content-Type: application/sparql-query" \
//    //    -H "Accept: application/sparql-results+json" << EOF \
//    //    | jq '.results.bindings[] | .[].value' | fgrep - q 'default'
//    //select * where { ?s ? p ? o }
//    //EOF

//    //curl_sparql_request default -graph - uri=urn: dydra:default

//    //"default-graph-uri=urn:dydra:default"

//    const testName1 = 'POST_srj_test_sub2';
//    const paramUriEnc1 = 'query=select * where { ?s ? p ? o }';
//    const acceptHeader1 = 'application/sparql-results+json';
//    const contentType1 = "application/sparql-query";
//    const optionsParam = {
//        ["Content-Type"]: contentType1,
//        ["Accept"]: acceptHeader1
//    };




//}

//POST_srj_test_sub3() {

//    //curl_sparql_request  default -graph - uri=urn: dydra: all \
//    //    -H "Content-Type: application/sparql-query" \
//    //    -H "Accept: application/sparql-results+json" << EOF \
//    //    | jq '.results.bindings[] | .[].value' | fgrep - q 'named'
//    //select * where { ?s ? p ? o }
//    //EOF

//}

//POST_srj_test_sub4() {
//    //curl_sparql_request  default -graph - uri=urn: dydra: named\
//    //    -H "Content-Type: application/sparql-query" \
//    //    -H "Accept: application/sparql-results+json" << EOF \
//    //    | jq '.results.bindings[] | .[].value' | fgrep - q - v 'default'
//    //select * where { ?s ? p ? o }
//    //EOF

//}


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