// Generated automatically by nearley, version 2.15.1
// http://github.com/Hardmath123/nearley

function id(x) { return x[0]; }

/*
var nearley = require('nearley')
var moo = require('moo');
var nqg = require ('./n-quads-grammar.js')
var nqp = new nearley.Parser(nearley.Grammar.fromCompiled(nqg))
nqp.feed("<http://example.org/subject><http://example.org/predicate> \"a string\".\n").results[0]
nqp.feed("_:blank1 <http://example.org/predicate> \"a string\".\n").results[0]
nqp.feed("_:blank1 <http://example.org/predicate>  <http://example.org/object> .\n").results[0]
nqp.feed("_:blank1 <http://example.org/predicate>  <http://example.org/object> <http://example.org/g>.\n").results[0]
nqp.feed("<http://example.org/subject> <http://example.org/predicate>  <http://example.org/object> <http://example.org/g>.\n").results[0]
nqp.feed("<http://example.org/subject> <http://example.org/predicate> \"a string\" <http://example.org/g>.\n").results[0]
nqp.feed("<http://example.org/subject> <http://example.org/predicate> \"a literal\"^^<http://of/type> <http://example.org/g>.\n").results[0]

nqp.feed("<http://example.org/subject><http://example.org/predicate> <http://example.org/object>.\n").results[0]

nqp.feed("<http://example.org/subject><http://example.org/predicate><http://example.org/object1>.\n" +
  "<http://example.org/subject><http://example.org/predicate><http://example.org/object2>.\n" +
  "\"a string\"^^<http://www.w3.org/2001/XMLSchema#string> .").results[0]

nqp.feed("<http://example.org/subject><http://example.org/predicate><http://example.org/object1>.\n" +
  "<http://example.org/subject><http://example.org/predicate><http://example.org/object2>.\n" +
  "<http://example.org/subject><http://example.org/predicate> _:blank1 .").results[0].map(function(s) {return(s.object);})
 util.inspect(parser.feed("<http://example.org/subject><http://example.org/predicate>_:blank1.").results, false, null)
*/

/*
var moo = require('moo');
class RDFEnvironment {
  createNamedNode (lf) { return ({type: 'NamedNode', lexicalForm: lf}); }
  createBlankNode (lf) { return ({type: 'BlankNode', lexicalForm: lf}); }
  createLiteral (lf, lang, type) {
    // console.log("literal", lf, lang, type);
    return({type: 'Literal', lexicalForm: lf, language: lang, type: type});
  }
  createQuad (s,p,o,g) { return({type: 'quad', s: s, p: p, o: o, g: g}); }
}*/

import { NamedNode, Graph, RDFEnvironment } from '/javascripts/replication/rdf-environment.js';
import * as moo from  './lib/moo/moo.js';
export {grammar};

var HEXPattern = function() { return ('(?:[0-9]|[A-F]|[a-f])'); }
var UCHARPattern = function() { return ('(?:\\u' + HEXPattern() + '{4}|\\U' + HEXPattern() + '{8})'); }
var ECHARPattern = function() { return ('\\[tbnrf"\'\\]'); }
var PN_CHARS_BASEPattern = function() { return ('(?:[A-Z]|[a-z]|[\u00C0-\u00D6]|[\u00D8-\u00F6]|[\u00F8-\u02FF]|[\u0370-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\u10000-\uEFFFF])'); }
var PN_CHARS_UPattern = function() { return ('(?:' + PN_CHARS_BASEPattern() + '|_|:)'); }
var PN_CHARSPattern = function() { return('(?:' + PN_CHARS_UPattern() +'|-|[0-9]|\u00B7|[\u0300-\u036F]|[\u203F-\u2040])'); }
var _environment = null;
var environment = function () {
  return (_environment || (_environment = new RDFEnvironment()));
}
var term = function(parseResult) {
  if (parseResult) {
    //console.log('term.pr: ', parseResult);
    if ((typeof parseResult) == "string") {
      return ( parseResult);
    } else {
      switch (parseResult.type) {
        case 'IRIREF': return (environment().createNamedNode(parseResult.value));
        case 'BLANK_NODE_LABEL':
          //console.log("term.bnl: ", parseResult);
          return (environment().createBlankNode(parseResult.value));
        case 'STRING_LITERAL_QUOTE': return (parseResult.value);
        case 'literal' : return (parseResult.value);
        default : //console.log("term: unknown: ", parseResult);
          return (parseResult);
      }
    }
  } else {
    return (null);
  }
}
var re0 = new RegExp("" + UCHARPattern() + "*")
var re1 = new RegExp(/(?:[^"\\\u005C\u000A\u000D]*(?:\\.[^"\\]*)*)/)
var re2 = new RegExp(/(?:[^'\\\u005C\u000A\u000D]*(?:\\.[^'\\]*)*)/)
var reString = new RegExp( '"' + re1.source + re0.source + '"' + "|" + "'" + re2.source + re0.source + "'")

const lexer = moo.compile({
  DOT:          /\./,
  WS:           {match: /[\u0009\u0020]+/, lineBreaks: false},
  EOL:          {match: /[\u000D\u000A]+/ , lineBreaks: true},
  LANGTAG:      {match: new RegExp('@[a-zA-Z]+(?:-[a-zA-Z0-9]+)?'),
                 value: function(token) { return(token.slice(1)); }
                } ,
  IRIREF:       {match: new RegExp('<(?:[^\u0000-\u0020<>"{}|^`\\\\])*>'), //|' + UCHARPattern() +')*>') ,
                 value: function(token) {
                   var lexicalForm = token.slice(1, -1);
                   //console.log("lexer.IRIREF: ", lexicalForm);
                   //console.log("lexer.rdfe: ", RDFEnvironment); 
                   //return (environment().createNamedNode(lexicalForm));
                   return (lexicalForm);
                 }},
  CARAT:        {match: /\^\^/, lineBreaks: false},
  STRING_LITERAL_QUOTE: { match: reString,
                         value: function(token) { return (token.slice(1, -1));} } ,
  BLANK_NODE_LABEL: { match: new RegExp('_:(?:' + PN_CHARS_UPattern() + '|[0-9])(?:(?:' + PN_CHARSPattern() + '|\\.)*' + PN_CHARSPattern() + ')?'),
                     value: function (token) {
                       var label = token.slice(2);
                       // console.log(`bnl '${label}'`);
   		       //return (RDFEnvironment.createBlankNode(label));
                       return (label);
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
          // console.log(result);
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
    {"name": "statement$ebnf$4", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)], "postprocess": id},
    {"name": "statement$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "statement$ebnf$5$subexpression$1$ebnf$1", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)], "postprocess": id},
    {"name": "statement$ebnf$5$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "statement$ebnf$5$subexpression$1", "symbols": ["graphLabel", "statement$ebnf$5$subexpression$1$ebnf$1"]},
    {"name": "statement$ebnf$5", "symbols": ["statement$ebnf$5$subexpression$1"], "postprocess": id},
    {"name": "statement$ebnf$5", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "statement", "symbols": ["statement$ebnf$1", "subject", "statement$ebnf$2", "predicate", "statement$ebnf$3", "object", "statement$ebnf$4", "statement$ebnf$5", (lexer.has("DOT") ? {type: "DOT"} : DOT)], "postprocess": 
        function(r) {
                //console.log('statement.r', r);
                //console.log('statement.r7', r[7], r[7]&&r[7][0]);
                var graph = ((r[7] && r[7][0]) ? term(r[7][0]) : null);
                //console.log('statement.r7.graph', graph);
        
                return (environment().createQuad(term(r[1]), term(r[3]), term(r[5]), graph));
                //console.log("reduce statement.subject", r[1]);
                //console.log("rdfe: ", RDFEnvironment);
                //return (environment().createQuad(r[1], r[3], r[5], (r[7] ? r[7].value : null)));
              }
        },
    {"name": "subject$subexpression$1", "symbols": [(lexer.has("IRIREF") ? {type: "IRIREF"} : IRIREF)]},
    {"name": "subject$subexpression$1", "symbols": [(lexer.has("BLANK_NODE_LABEL") ? {type: "BLANK_NODE_LABEL"} : BLANK_NODE_LABEL)]},
    {"name": "subject", "symbols": ["subject$subexpression$1"], "postprocess": 
        function(r) {
          r = r[0];
          //console.log('subject[0|1]', r);
          return(r[0] || r[1]);}
                                 },
    {"name": "predicate", "symbols": [(lexer.has("IRIREF") ? {type: "IRIREF"} : IRIREF)], "postprocess": id},
    {"name": "object$subexpression$1", "symbols": [(lexer.has("IRIREF") ? {type: "IRIREF"} : IRIREF)]},
    {"name": "object$subexpression$1", "symbols": [(lexer.has("BLANK_NODE_LABEL") ? {type: "BLANK_NODE_LABEL"} : BLANK_NODE_LABEL)]},
    {"name": "object$subexpression$1", "symbols": ["literal"]},
    {"name": "object", "symbols": ["object$subexpression$1"], "postprocess": 
        function(r) {
          // console.log('object.r', r);
          var object = r[0][0];
          // console.log('object', object);
          return (object);
        }
                                 },
    {"name": "graphLabel$subexpression$1", "symbols": [(lexer.has("IRIREF") ? {type: "IRIREF"} : IRIREF)]},
    {"name": "graphLabel$subexpression$1", "symbols": [(lexer.has("BLANK_NODE_LABEL") ? {type: "BLANK_NODE_LABEL"} : BLANK_NODE_LABEL)]},
    {"name": "graphLabel", "symbols": ["graphLabel$subexpression$1"], "postprocess":  function(r) {
          //console.log('graph.r', r);
          r = r[0][0];
          return(r);
        } },
    {"name": "literalType", "symbols": [(lexer.has("CARAT") ? {type: "CARAT"} : CARAT), (lexer.has("IRIREF") ? {type: "IRIREF"} : IRIREF)], "postprocess": function(r) { /* console.log('lt ', r); */ return (r[1].value); }},
    {"name": "literal$ebnf$1$subexpression$1", "symbols": ["literalType"]},
    {"name": "literal$ebnf$1$subexpression$1", "symbols": [(lexer.has("LANGTAG") ? {type: "LANGTAG"} : LANGTAG)]},
    {"name": "literal$ebnf$1", "symbols": ["literal$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "literal$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "literal", "symbols": [(lexer.has("STRING_LITERAL_QUOTE") ? {type: "STRING_LITERAL_QUOTE"} : STRING_LITERAL_QUOTE), "literal$ebnf$1"], "postprocess": 
        function(r) {
          // console.log("r ", r);
          var [literal, qualifier] = r;
          // console.log(literal, qualifier);
          var term = null;
          if (qualifier) {
            qualifier = qualifier[0];
            if (qualifier.type == "LANGTAG") {
              term = environment().createLiteral(literal.value, qualifier.value, null);
            } else {
              term = environment().createLiteral(literal.value, null, qualifier);
            }
          } else {
            term = literal.value; // term = environment().createLiteral(literal.value, null, null);
          }
          // console.log("literal term", term);
          return ( term );
        }
                                 }
]
  , ParserStart: "nquadsDoc"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}

