// Copyright (c) 2019 datagraph gmbh

// Generated automatically by nearley, version 2.15.1
// http://github.com/Hardmath123/nearley
import {RDFEnvironment} from './rdf-environment.js';
import * as moo from  '/javascripts/vendor/moo/moo.js';
export {grammar};

function id(x) { return x[0]; }

/*
parser.feed("<http://example.org/subject><http://example.org/predicate><http://example.org/object1>.\n" +
  "<http://example.org/subject><http://example.org/predicate><http://example.org/object2>.\n" +
  "<http://example.org/subject><http://example.org/predicate>_:blank1 .").results[0].map(function(s) {return(s.object);})
 util.inspect(parser.feed("<http://example.org/subject><http://example.org/predicate>_:blank1.").results, false, null)
*/


var HEXPattern = function() { return ('(?:[0-9]|[A-F]|[a-f])'); }
var UCHARPattern = function() { return ('(?:\\u' + HEXPattern() + '{4}|\\U' + HEXPattern() + '{8})'); }
var ECHARPattern = function() { return ('\\[tbnrf"\'\\]'); }
var PN_CHARS_BASEPattern = function() { return ('(?:[A-Z]|[a-z]|[\u00C0-\u00D6]|[\u00D8-\u00F6]|[\u00F8-\u02FF]|[\u0370-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\u10000-\uEFFFF])'); }
var PN_CHARS_UPattern = function() { return ('(?:' + PN_CHARS_BASEPattern() + '|_|:)'); }
var PN_CHARSPattern = function() { return('(?:' + PN_CHARS_UPattern() +'|-|[0-9]|\u00B7|[\u0300-\u036F]|[\u203F-\u2040])'); }

const lexer = moo.compile({
  DOT:          /\./,
  WS:           {match: /[\u0009\u0020]+/, lineBreaks: false},
  EOL:          {match: /[\u000D\u000A]+/ , lineBreaks: true},
  LANGTAG:      {match: new RegExp('@[a-zA-Z]+(?:-[a-zA-Z0-9]+)?')} ,
  IRIREF:       {match: new RegExp('<(?:[^\u0000-\u0020<>"{}|^`\\\\])*>'), //|' + UCHARPattern() +')*>') ,
                 value: function(token) {
                   var lexicalForm = token.slice(1, -1);
                   return (RDFEnvironment.createNamedNode(lexicalForm));
                 }},
  STRING_LITERAL_QUOTE: { match: new RegExp( '"(?:[^"\u005C\u000A\u000D]|' + ECHARPattern() + '|' + UCHARPattern() + ')"'),
                         value: function(token) { return (token.slice(1, -1));} } ,
  BLANK_NODE_LABEL: { match: new RegExp('_:(?:' + PN_CHARS_UPattern() + '|[0-9])(?:(?:' + PN_CHARSPattern() + '|\.)*' + PN_CHARSPattern() + ')?'),
                     value: function (token) {
                       var label = token.slice(2);
   		       return (RDFEnvironment.createBlankNode(label));
 		     } } ,
});
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "nquadsDoc$ebnf$1", "symbols": []},
    {"name": "nquadsDoc$ebnf$1", "symbols": ["nquadsDoc$ebnf$1", "statementEOL"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "nquadsDoc$ebnf$2", "symbols": ["statement"], "postprocess": id},
    {"name": "nquadsDoc$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "nquadsDoc", "symbols": ["nquadsDoc$ebnf$1", "nquadsDoc$ebnf$2"], "postprocess": 
        function(r) {
          var statementList = r[0];
          var statement = r[1];
          var result = [].concat((statementList ? statementList : [])).concat(statement ? [statement] : []);
          console.log(result);
          return (result);
        }
        },
    {"name": "statementEOL", "symbols": ["statement", (lexer.has("EOL") ? {type: "EOL"} : EOL)], "postprocess": function(r) { return(r[0]); }},
    {"name": "statement$ebnf$1", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)], "postprocess": id},
    {"name": "statement$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "statement$ebnf$2", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)], "postprocess": id},
    {"name": "statement$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "statement$ebnf$3", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)], "postprocess": id},
    {"name": "statement$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "statement$ebnf$4$subexpression$1$ebnf$1", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)], "postprocess": id},
    {"name": "statement$ebnf$4$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "statement$ebnf$4$subexpression$1", "symbols": ["graphLabel", "statement$ebnf$4$subexpression$1$ebnf$1"]},
    {"name": "statement$ebnf$4", "symbols": ["statement$ebnf$4$subexpression$1"], "postprocess": id},
    {"name": "statement$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "statement", "symbols": ["subject", "statement$ebnf$1", "predicate", "statement$ebnf$2", "object", "statement$ebnf$3", "statement$ebnf$4", (lexer.has("DOT") ? {type: "DOT"} : DOT)], "postprocess": 
        function(r) {
          return (RDFEnvironment.createQuad(r[0].value, r[2].value, r[4].value, (r[6] ? r[6].value : null)));
        }
        },
    {"name": "subject$subexpression$1", "symbols": [(lexer.has("IRIREF") ? {type: "IRIREF"} : IRIREF)]},
    {"name": "subject$subexpression$1", "symbols": [(lexer.has("BLANK_NODE_LABEL") ? {type: "BLANK_NODE_LABEL"} : BLANK_NODE_LABEL)]},
    {"name": "subject", "symbols": ["subject$subexpression$1"], "postprocess": 
        function(r) { r = r[0]; return(r[0] || r[1]);}
                                 },
    {"name": "predicate", "symbols": [(lexer.has("IRIREF") ? {type: "IRIREF"} : IRIREF)], "postprocess": id},
    {"name": "object$subexpression$1", "symbols": [(lexer.has("IRIREF") ? {type: "IRIREF"} : IRIREF)]},
    {"name": "object$subexpression$1", "symbols": [(lexer.has("BLANK_NODE_LABEL") ? {type: "BLANK_NODE_LABEL"} : BLANK_NODE_LABEL)]},
    {"name": "object$subexpression$1", "symbols": ["literal"]},
    {"name": "object", "symbols": ["object$subexpression$1"], "postprocess": 
        function(r) { r = r[0]; return(r[0] || r[1] || r[2]);}
                                 },
    {"name": "graphLabel$subexpression$1", "symbols": [(lexer.has("IRIREF") ? {type: "IRIREF"} : IRIREF)]},
    {"name": "graphLabel$subexpression$1", "symbols": [(lexer.has("BLANK_NODE_LABEL") ? {type: "BLANK_NODE_LABEL"} : BLANK_NODE_LABEL)]},
    {"name": "graphLabel", "symbols": ["graphLabel$subexpression$1"], "postprocess": function(r) { r = r[0][0]; return(r[0] || r[1]); }},
    {"name": "literal$ebnf$1$subexpression$1", "symbols": [{"literal":"^^"}, (lexer.has("IRIREF") ? {type: "IRIREF"} : IRIREF)]},
    {"name": "literal$ebnf$1$subexpression$1", "symbols": [(lexer.has("LANGTAG") ? {type: "LANGTAG"} : LANGTAG)]},
    {"name": "literal$ebnf$1", "symbols": ["literal$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "literal$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "literal", "symbols": [(lexer.has("STRING_LITERAL_QUOTE") ? {type: "STRING_LITERAL_QUOTE"} : STRING_LITERAL_QUOTE), "literal$ebnf$1"]}
]
  , ParserStart: "nquadsDoc"
};
