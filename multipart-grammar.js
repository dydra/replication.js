// Generated automatically by nearley, version 2.15.1
// http://github.com/Hardmath123/nearley

import * as moo from  '/javascripts/vendor/moo/moo.js';
export {grammar};

function id(x) { return x[0]; }

/*
var nearley = require('nearley')
var mp = require ('./multipart.js')
var mpParse = new nearley.Parser(nearley.Grammar.fromCompiled(mp))
lexer.reset("--b1\n\nline 1\nline2\n--b1--\n");
for (var i = lexer.next(); i ; i = lexer.next()) { console.log(i);}

mpParse.feed("--b1\n\nline 1\nline2\n--b1--\n").results[0]
mpParse.feed("--b1\n\nline 1\nline2\n\n--b1\nHeader: value\n\nline 3\nline 4\n--b1--\n").results[0]

import * as moo from  '/javascripts/vendor/moo/moo.js';
export {grammar};
*/

const lexer = moo.compile({
  END_BOUNDARY: {match: /--.*--/, lineBreaks: false},
  BOUNDARY:     {match: /--.*/, lineBreaks: false},
  LINE:         {match: /.+/, lineBreaks: false},
  CRLF:         {match: /\u000D?\u000A/,  lineBreaks: true},
});
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "multipart$ebnf$1", "symbols": ["partList"], "postprocess": id},
    {"name": "multipart$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "multipart", "symbols": ["multipart$ebnf$1", (lexer.has("END_BOUNDARY") ? {type: "END_BOUNDARY"} : END_BOUNDARY), (lexer.has("CRLF") ? {type: "CRLF"} : CRLF)], "postprocess": 
        function(r) {
          return ( r[0]);
        }
        },
    {"name": "partList$ebnf$1", "symbols": ["partList"], "postprocess": id},
    {"name": "partList$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "partList", "symbols": ["part", "partList$ebnf$1"], "postprocess": 
        function(r) {
           var partRest = r[1];
           var partFirst = r[0];
           var result = [].concat([partFirst], (partRest ? partRest : []));
           //console.log('partFirst'); console.log(partFirst);
           //console.log('partRest'); console.log(partRest);
           //console.log('parts'); console.log(result);
           return (result);
         }
        },
    {"name": "part", "symbols": ["boundaryLine", "headers", (lexer.has("CRLF") ? {type: "CRLF"} : CRLF), "content"], "postprocess": 
        function(r) { // console.log('part'); console.log(r);
          var headers = {};
          r[1].forEach(function([name, value]) { headers[name] = value;});
          return([headers, r[3].join('\r\n')]); }
                                 },
    {"name": "boundaryLine", "symbols": [(lexer.has("BOUNDARY") ? {type: "BOUNDARY"} : BOUNDARY), (lexer.has("CRLF") ? {type: "CRLF"} : CRLF)], "postprocess": 
        function(r) { // console.log('boundary'); console.log(r);
          return (null)}
                                 },
    {"name": "headers$ebnf$1", "symbols": []},
    {"name": "headers$ebnf$1", "symbols": ["headers$ebnf$1", "headerLine"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "headers", "symbols": ["headers$ebnf$1"], "postprocess": 
        function(r) { // console.log('headers'); console.log(r);
          return(r[0]); }
                                 },
    {"name": "headerLine", "symbols": [(lexer.has("LINE") ? {type: "LINE"} : LINE), (lexer.has("CRLF") ? {type: "CRLF"} : CRLF)], "postprocess": 
        function(r) { // console.log('header'); console.log(r);
          var [v, name, value] = r[0].text.match(/([^:]+):(.+)/)
          return([name, value]); }
                                 },
    {"name": "content$ebnf$1", "symbols": []},
    {"name": "content$ebnf$1", "symbols": ["content$ebnf$1", "contentLine"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "content", "symbols": ["content$ebnf$1"], "postprocess": 
        function(r) { // console.log('content'); console.log(r);
          return(r[0]); }
                                 },
    {"name": "contentLine$ebnf$1", "symbols": [(lexer.has("CRLF") ? {type: "CRLF"} : CRLF)]},
    {"name": "contentLine$ebnf$1", "symbols": ["contentLine$ebnf$1", (lexer.has("CRLF") ? {type: "CRLF"} : CRLF)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "contentLine", "symbols": [(lexer.has("LINE") ? {type: "LINE"} : LINE), "contentLine$ebnf$1"], "postprocess": 
        function(r) { // console.log('line'); console.log(r);
          return(r[0].text); }
                                 }
]
  , ParserStart: "multipart"
}

