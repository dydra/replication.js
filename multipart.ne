# multipart.ne
# parse a multipart stream to yield a sequence of [header, body] pairs.
#
# nearleyc -o multipart-grammar.js -e multipart multipart.ne
@{%
/*
var nearley = require('nearley')
var mp = require ('./multipart.js')
var mpParse = new nearley.Parser(nearley.Grammar.fromCompiled(mp))
lexer.reset("--b1\n\nline 1\nline2\n--b1--\n");
for (var i = lexer.next(); i ; i = lexer.next()) { console.log(i);}

mpParse.feed("--b1\n\nline 1\nline2\n--b1--\n").results[0]
mpParse.feed("--b1\n\nline 1\nline2\n\n--b1\nHeader1: value2\nHeader2: value2\n\nline 3\nline 4\n--b1--\n").results[0]

import * as moo from  './vendor/moo/moo.js';
export {grammar};
*/

const moo = require("moo");

const lexer = moo.compile({
  END_BOUNDARY: {match: /--.*--/, lineBreaks: false},
  BOUNDARY:     {match: /--.*/, lineBreaks: false},
  LINE:         {match: /.+/, lineBreaks: false},
  CRLF:         {match: /\u000D?\u000A/,  lineBreaks: true},
});
%}
@lexer lexer

multipart       ->  partList:? %END_BOUNDARY %CRLF {%
  function(r) {
    return ( r[0]);
  }
%}
partList             ->  part partList:? {% 
 function(r) {
    var partRest = r[1];
    var partFirst = r[0];
    var result = [].concat([partFirst], (partRest ? partRest : []));
    //console.log('partFirst'); console.log(partFirst);
    //console.log('partRest'); console.log(partRest);
    //console.log('parts'); console.log(result);
    return (result);
  }
%}

part                 ->  boundaryLine headers %CRLF content {%
                           function(r) { // console.log('part'); console.log(r);
                             var headers = {};
                             r[1].forEach(function([name, value]) { headers[name] = value;});
                             return([headers, r[3].join('\r\n')]); }
                         %}
boundaryLine         ->  %BOUNDARY %CRLF {%
                           function(r) { // console.log('boundary'); console.log(r);
                             return (null)}
                         %}
headers              ->  headerLine:*{%
                           function(r) { // console.log('headers'); console.log(r);
                             return(r[0]); }
                         %}
headerLine           ->  %LINE %CRLF {%
                           function(r) { // console.log('header'); console.log(r);
                             var [v, name, value] = r[0].text.match(/([^:]+):(.+)/)
                             return([name, value]); }
                         %}
content              ->  contentLine:*{%
                           function(r) { // console.log('content'); console.log(r);
                             return(r[0]); }
                         %}
contentLine          ->  %LINE %CRLF:+ {%
                           function(r) { // console.log('line'); console.log(r);
                             return(r[0].text); }
                         %}

