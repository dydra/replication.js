# Copyright (c) 2019 datagraph gmbh
# from the w3c n-quads recommendation: https://www.w3.org/TR/n-quads/
@{%
/*
parser.feed("<http://example.org/subject><http://example.org/predicate><http://example.org/object1>.\n" +
  "<http://example.org/subject><http://example.org/predicate><http://example.org/object2>.\n" +
  "<http://example.org/subject><http://example.org/predicate>_:blank1 .").results[0].map(function(s) {return(s.object);})
 util.inspect(parser.feed("<http://example.org/subject><http://example.org/predicate>_:blank1.").results, false, null)
*/

import {RDFEnvironment} from './rdf-environment.js';
import * as moo from  '/javascripts/vendor/moo/moo.js';
export {grammar};

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
%}
@lexer lexer

nquadsDoc            ->  statementEOL:* statement:? {%
  function(r) {
    var statementList = r[0];
    var statement = r[1];
    var result = [].concat((statementList ? statementList : [])).concat(statement ? [statement] : []);
    console.log(result);
    return (result);
  }
%} 
statementEOL         ->  statement %EOL {% function(r) { return(r[0]); } %}
statement            ->  subject %WS:? predicate %WS:? object %WS:? ( graphLabel %WS:?):? %DOT {%
  function(r) {
    return (RDFEnvironment.createQuad(r[0].value, r[2].value, r[4].value, (r[6] ? r[6].value : null)));
  }
%}
subject	             ->  (%IRIREF | %BLANK_NODE_LABEL) {%
                           function(r) { r = r[0]; return(r[0] || r[1]);}
                         %}
predicate            ->  %IRIREF {% id %}
object	             ->  (%IRIREF | %BLANK_NODE_LABEL | literal ) {%
                           function(r) { r = r[0]; return(r[0] || r[1] || r[2]);}
                         %}
graphLabel           ->  (%IRIREF | %BLANK_NODE_LABEL) {% function(r) { r = r[0][0]; return(r[0] || r[1]); } %}
literal	             ->  %STRING_LITERAL_QUOTE ("^^" %IRIREF | %LANGTAG):? {%
                           function(literal, iriref, langtag) {
                             if (iriref ||
                               return(createLiteral(literal, iriref));
                             } else if (langtag) {
                               return(create
                           }
                         %}


