// Copyright (c) 2020 datagraph gmbh

// retrieve a simple rdf document

var ge = new document.RDFEnvironment();
document.SESAME.get("https://nl4.dydra.com/TicTacKnow/data/one.rdf", {},
                    function(response) {
                      response.text().then(function(document) {
                                             return( ge.decode(document, "application/n-quads", console.log) ); } ); });

