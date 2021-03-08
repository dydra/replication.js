// Copyright (c) 2019 datagraph gmbh

import {getResource} from './resource-access.js';
import {GraphObject} from './graph-object.js';
import { makeUUIDString } from './revision-identifier.js';
import { NamedNode } from './rdf-environment.js';

/**
   The class RDFGraphObject extends the GraphObject definition with logic to
   encode patches with RDF terms.
*/

export class RDFGraphObject extends GraphObject {
    constructor() {
        super();
    }

    /**
       Delegate to the base method and then rewrite the statement components
       to be rdf terms.
    */
    asPatch() {
        var self = this._self || this;
        var patch = super.asPatch();
        var rdfPatch = {};
        console.trace("asPatch: generic", patch)
        for (let [mode, assertions] of Object.entries(patch)) {
            rdfPatch[mode] = self.assertionStatements(assertions);
        }
        console.log("asPatch: rdf", this.constructor.name, rdfPatch);
        return (rdfPatch);
    }

    assertionStatements(assertions) {
        console.log("assertionStatements", assertions);
        var thisObject = this;
        function assertionStatement(assertion) {
            var [subject, name, value] = assertion;
            var predicate = thisObject.getPropertyIdentifier(name);
            if (!predicate) {
                throw new Error(`field predicate unknown: ${name}`);
            }
            return ([subject, predicate, value]);
        }
        return (assertions.map(assertionStatement));
    }
}

window.RDFGraphObject = RDFGraphObject;

/**
   Given a location which designates a sparql view, retrieve the json encoding
   and compute from it the equivalent graph-object definition.

   @param {string} location
*/

export function getSparqlClass(location, continuation) {
    function computeAndContinue(definition) {
       continuation(computeSparqlClass(definition))
    }
    getResource(location, {"Accept": 'application/sparql-query+json'}, computeAndContinue);
}
RDFGraphObject.getSparqlClass = getSparqlClass;

/**
   Given a location which designates a SPARQL view, delegate to getSparqlClass to
   retrieve  the definition and us the location to name its global definition
   
   @param {string} location
   @param {function} continuation
*/
 
export function defSparqlClass(resourceLocation, continuation = null) {
    function bindAndContinue(theClass) {
        window[theClass.name] = theClass;
        if (continuation) {
            continuation(theClass);
        }
    }
    return (getSparqlClass(resourceLocation, bindAndContinue));
}
RDFGraphObject.defSparqlClass = defSparqlClass;

export function computeSparqlClass(sparqlDefinition) {
    var location = sparqlDefinition.location;
    var locationUri = new URL(location);
    var className = locationUri.pathname.split('/').pop();
    var statementPatterns = [];
    var propertyDefinitions = {};  // definitions, by name only, for use in constructor
    var propertyNames = []; // names for use in state management
    var propertyMap = new Map(); // uri+name map for use in codecs
    function extractPatterns(json) {
        for (var [name, value] of Object.entries(json)) {
            if (name == "type" && value == "Triple") {
                statementPatterns.push(json);
                break;
            } else if (typeof value == 'object') {
                extractPatterns(value);
            }
        }
    }

    // don't add abbrreviated desriptor to map only
    // var typeDescriptor = {name: "@type", identifier: NamedNode.rdf.type};
    // propertyMap.put("@type", typeDescriptor);
    // propertyMap.put(NamedNode.rdf.type, typeDescriptor);

    // console.log("extracting...", className);
    extractPatterns(sparqlDefinition);
    console.log("computeSparqlClass.statementPatterns", statementPatterns);

    // this retains just one pattern for a given predicate
    for (var pattern of statementPatterns) {
        var predicate = pattern.predicate;
        var object = pattern.object;
        if (object.termType == 'Variable') {
            var name = object.value;
            var url = predicate.value;
            console.log("nme url", name, url);
            var identifier = url;
            var descriptor = Object.create(null);
            descriptor.writable = true;
            descriptor.value = undefined;
            descriptor.enumerable = true;
            descriptor.name = name;
            descriptor.identifier = identifier;
            propertyNames.push(name);
            propertyDefinitions[name] = descriptor;
            propertyMap.set(name, descriptor);
            if (propertyMap.get(identifier)) {
              console.warn(`computeSparqlClass: predicate appears multiple times: ${identifier}.`);
            }
            propertyMap.set(identifier, descriptor);
            console.log("computeSparqlClass.descriptor", descriptor)
        }
    }

    const sparqlClass =
        {[className]: class extends RDFGraphObject {
            constructor() {
                super();
                // get the target and work on that
                var self = this._self || this;
                console.log("constructor", className, this, self, propertyDefinitions);
                for (let [name, descriptor] of Object.entries(propertyDefinitions)) {
                    Object.defineProperty(self, name, descriptor);
                }
            }}} [className];
    sparqlClass._persistentProperties = propertyNames;
    sparqlClass._transactionalProperties = propertyNames;
    sparqlClass.propertyDefinitions = propertyMap;
    console.log("computeSparqlClass map", sparqlClass.name, propertyMap);
    return (sparqlClass);
}

/**
   Given an RDFGraphObject instance, generate a html presentation
   
   @param {RDFGraphObject} instance
   @param {object} options
*/

RDFGraphObject.objectEditorCss = {
  backgroundColor: "#f8f8f8",
  border: "dotted 1px gray",
  borderRadius: "4px",
  fontSize: "10px"
}

RDFGraphObject.objectPresentation = function(object, options = {}) {
    console.log("RDFGraphObject.objectEditor: ", object, options);
    options = options || {};
    var fieldsElement = document.createElement('div');
    var row = 1;
    var objectEditable = (options.hasOwnProperty("editable") ? options.editable : true);
    var editedElements = {};
    var allElements = {};
    var labelWidth = 40;
    var valueWidth = 100;
    var elementWidth = 0;
    var elementHeight = 24;
    var gridPad = 10;
    var pixelsPerCharacter = 10;
    var editableProperties = object.editableProperties();
    var classStyle = object.constructor.objectEditorCss;
    var optionsStyle = options.style;
    console.log("objectEditor: styles", classStyle, optionsStyle);

    function addFieldElements(key) {
        var value = object[key] || "";
        var definition = Object.getOwnPropertyDescriptor(object, key);
        var editable = objectEditable && (definition ? definition.writable : false)
        var element = document.createElement('div');
        var labelElement = document.createElement('div');
        var valueElement = document.createElement('div');
        var valueStyle = Object.assign({}, classStyle[key]||{}, optionsStyle[key]||{});
        
        labelElement.innerText = key;
        labelWidth = Math.max(labelWidth, (key.length +2) * pixelsPerCharacter);
        labelElement.className = "editorLabel";
        labelElement.style.cssText = "display: block; height: 8px; font-size: 8pt; padding: 0; position: absolute; right: 6px; top: -11px;";
        valueElement.className = "editorValue";
        valueElement.style.textAlign =  "left";
        valueElement.style.height =  elementHeight + "px";
        valueElement.style.marginTop =  "2px";
        valueElement.style.paddingLeft =  "2px";
        for (var [property, cssValue] of Object.entries(valueStyle)) {
          valueElement.style[property] = cssValue;
        };
        var styleWidth = Number.parseInt(valueElement.style.width || "0px");
        
        valueElement.contentEditable = editable;
        if (editable) {
           valueElement.style.backgroundColor = "#ffffff";
           valueElement.style.borderLeft = "solid 1px #d3d3d3";
           valueElement.style.borderRight = "solid 1px #d3d3d3";
           valueElement.style.borderBottom = "solid 1px #d3d3d3";
        } else {
           valueElement.style.borderBottom = "solid 1px #d3d3d3";
        }
        setElementText(valueElement, value);
        allElements[key] = valueElement;
        valueWidth = Math.max(valueWidth, (valueElement.innerText.length * pixelsPerCharacter), styleWidth)
        valueElement.addEventListener("keyup", function(event) {
            // test again here to allow value to disable edit
            if (valueElement.contentEditable=="true") {
                if (!editedElements[key]) { editedElements[key] = valueElement; }
            }
        });
        element.style.cssText = "position: relative; top: 0; left: 0; grid-column: 1;" ;
        // the object's class can define appropriate grid regions
        element.style.gridRow = row;
        element.className = key;
        element.appendChild(labelElement);
        element.appendChild(valueElement);
        fieldsElement.appendChild(element);
        row ++;
    };
    function setElementText(element, value) {
        switch (typeof(value)) {
        case 'null':
        case 'undefined':
            value = "";
            break;
        case 'number':
            value = value.toString();
            break;
        case 'string':
            break;
        case 'object':
            if (value instanceof RDFGraphObject) {
                value = value.id;
            } else if (value instanceof URL) {
                value = value.toString();
            } else {
                value = value.toString();
                element.contentEditable = false;
            }
            break;
        }
        element.innerText = value;
    }
    function setObject(newObject) {
        object = newObject;
        updateFields();
    }
    function updateFields() {
        editableProperties.forEach(function(key) {
          setElementText(allElements[key], object[key]);
          delete editedElements[key];
        });
    }
    function updateObject() {
        var count = 0;
        function applyElement(key) {
            var element = editedElements[key];
            var text = element.innerText.trim();
            var value = object[key];
            console.log("updating", element, text, value);
            switch (typeof(value)) {
            case 'undefined':
            case 'null': // absent type declarations, limited to strings
            case 'string':
                object[key] = text;
                count ++;
                break;
            case 'number' :
                value = (text.indexOf('.') >= 0 ? Number.parseFloat(text) :  Number.parseInt(text))
                    object[key] = value;
                count ++;
                break;
            case 'object':
                
            if (value instanceof RDFGraphObject) {
                // ignore
            } else if (value instanceof URL) {
                object[key] = new URI(text);
                count ++;
            } else {
                // ignore
            }
            break;
            }
        }
        Object.keys(editedElements).forEach(applyElement);
        console.log("objectEditor.updateObject: edited", editedElements);
        console.log("objectEditor.state", object._state, object._deltas);
        return (count);
    }
    editableProperties.forEach(addFieldElements);    
    fieldsElement.id = object.id || makeUUIDString();
    fieldsElement.updateObject = updateObject;
    fieldsElement.updateFields = updateFields;
    fieldsElement.setObject = setObject;
    fieldsElement.getObject = function () { return (object) };
    fieldsElement.style.display = "grid";
    fieldsElement.style.gridTemplateRows = `repeat(${row-1}, auto)`;
    fieldsElement.style.gridTemplateColumns = "1";
    // augment and/or override css for entries which do not correspond to object fields
    for (var [property, value] of Object.entries(object.constructor.objectEditorCss)) {
        if (! editableProperties.includes(property)) {
            fieldsElement.style[property] = value;
        }
    }

    // resize all element to the max
    elementWidth = Math.max(labelWidth, valueWidth);
    fieldsElement.querySelectorAll('.editorValue').forEach(function(elt) {
        elt.style.width = elementWidth +"px";
        elt.parentNode.style.width = elt.style.width;
    });
    fieldsElement.style.width = (elementWidth +4) + "px";
    fieldsElement.style.paddingTop = "8px";
    fieldsElement.style.paddingLeft = "2px";
    fieldsElement.style.paddingBottom = "2px";
    fieldsElement.style.gridRowGap = gridPad +"px";
    return(fieldsElement);
}


/**
   Given an object, create and display editor with save/abort controls

   The save option persists the changes while the abort option rolls them back

   @param {RDFGraphObject} object
   @param {object} options
*/

RDFGraphObject.objectEditor = function(object, options = {}) {
    var presentation = this.objectPresentation(object, options);
    var frame = document.createElement('div');
    var controls = document.createElement('div');
    var get = document.createElement('span');
    var save = document.createElement('span');
    var reset = document.createElement('span');
    var trash = document.createElement('span');
    var idElement = document.createElement('span');
    var id = makeUUIDString();
    var [x, y] = options.coordinates || [0,0];
    var dragCount = 0;

    function dragFrame(event) {
        if (0 == dragCount ++) {
          frame.parentNode.addEventListener("drop", dropFrame);
        }
        event.dataTransfer.setData("text/plain+optionsposition", [event.layerX,event.layerY].toString());
        event.dataTransfer.setData("text/plain+id", event.target.id);
        event.dataTransfer.dropEffect = "move";
        console.log("dragging: ", event);
    }
    function dropFrame(event) {
        var position = /(\d+),(\d+)/.exec(event.dataTransfer.getData("text/plain+optionsposition"))
                                    .slice(1).map(function(s) {return (Number.parseInt(s))});
        var id = event.dataTransfer.getData("text/plain+id");
        console.log("dropFrame: ", event, position);
        if (position && id) {
            event.preventDefault();
            var droppedPane = section.querySelector('#'+id);
            droppedPane.style.top = (event.clientY - position[1])+"px";
            droppedPane.style.left = (event.clientX - position[0])+"px";
        }
    }
    function doGet(event) {
        var id = idElement.innerText;
        var store = object.store();
        console.log("doGet.........", object, id, store, object._store);
        window.doGetObject = object;
        if (id && store) {
          object.setIdentifier(id);
          store.get(object, function (newObject) {
            if (newObject) {
              object = newObject
              presentation.setObject(object);
            } else {
              console.log("not found: ", object);
            }
          });
        }
    }
    // (test-sparql "select distinct  ?s from <urn:dydra:all> where {?s ?p ?o}" :repository-id "james/cms")
    function doSave(event) {
        var id = idElement.innerText;
        var store = object.store();
        console.log("doSave", object);
        if (id && presentation.updateObject() > 0) {
          object.setIdentifier(id);
          if (store) {
            var transaction = store.database.transaction([store.name], "readwrite");
            console.log("opened transaction", store, transaction);
            console.log("store =?", store == transaction.stores[0]);
            console.log("object =?", object == transaction.stores[0].objects.get(object.getIdentifier()));
            //transaction.stores[0].put(object);
            transaction.commit();
          }
        }
    }
    function doReset(event) {
        // just reapply the object
        presentation.setObject(object);
    }
    function doDelete(event) {
        var store = object.store();
        if (store && object.getIdentifier()) {
          store.delete(object);
        }
    }

    frame.id = '_' + id;
    frame.style.position = options.position || "relative";
    frame.style.display = options.display || "block";
    frame.style.border = "dotted 1px gray";
    frame.style.paddingBottom = "2px";
    frame.style.top = y + "px";
    frame.style.left = x + "px";
    frame.style.height = "auto";
    frame.style.width = (Number.parseInt(presentation.style.width)+4) +"px";
    frame.draggable = "true";
    frame.setObject = function (newObject) { object = newObject; presentation.setObject(newObject); }
    frame.getObject = function () { return(object); };
    frame.updateFields = function () {
      idElement.innerText = object.getIdentifier() || "";
      presentation.updateFields();
    }
    frame.updateObject = presentation.updateObject;
    controls.style.backgroundColor = "#f0f0f0";
    controls.style.border = "none";
    controls.style.display = "grid";
    controls.style.height = "28px";
    controls.style.gridTemplateRows = "1";
    controls.style.gridTemplateColumns = " 1fr 24px 24px 24px 24px";
    controls.style.gridPad = "4px";
    get.style.width = "24px";
    get.style.height = "24px";
    get.style.gridColumn = "2";
    get.style.margin ="2px";
    //get.innerText = "get";
    get.style.backgroundImage = "url('https://dydra.com/icons/search.svg')";
    save.style.width = "24px";
    save.style.height = "24px";
    save.style.gridColumn = "3";
    save.style.margin ="2px";
    //save.innerText = "save";
    save.style.backgroundImage = "url('https://dydra.com/icons/device-floppy.svg')";
    reset.style.width = "24px";
    reset.style.height = "24px";
    reset.style.gridColumn = "4";
    reset.style.margin ="2px";
    //reset.innerText = "reset";
    reset.style.backgroundImage = "url('https://dydra.com/icons/rotate.svg')";
    trash.style.width = "24px";
    trash.style.height = "24px";
    trash.style.gridColumn = "5";
    trash.style.margin ="2px";
    //trash.innerText = "delete";
    trash.style.backgroundImage = "url('https://dydra.com/icons/trash.svg')";
    idElement.contentEditable = true;
    idElement.style.gridColumn = "1";
    idElement.style.margin ="2px";
    idElement.style.border = "solid 1px darkblue";

    idElement.innerText = object.getIdentifier() || "";

    
    frame.appendChild(presentation);
    frame.appendChild(controls);
    controls.appendChild(idElement);
    controls.appendChild(get);
    controls.appendChild(save);
    controls.appendChild(reset);
    controls.appendChild(trash);

    frame.addEventListener("dragstart", dragFrame);
    frame.addEventListener("keyup", function(event) {
            // Number 13 is the "Enter" key on the keyboard
            if (event.keyCode === 13) {
                // Cancel the default action, if needed
                event.preventDefault();
                // Trigger the button element with a click
                doSave(event);
            }
        });
    get.addEventListener("click", doGet);
    save.addEventListener("click", doSave);
    reset.addEventListener("click", doReset);
    trash.addEventListener("click", doDelete);
    
    return (frame);
}


/**
   Generate a html presentation for the instance
   
   @param {object} options
*/

RDFGraphObject.prototype.objectPresentation = function(options = {}) {
    return (this.constructor.objectPresentation(this, options));
}

/**
   Generate a html editor for the instance
   
   @param {object} options
*/

RDFGraphObject.prototype.objectEditor = function(options = {}) {
    return (this.constructor.objectEditor(this, options));
}

/*
 // an trivial document
 var rgo = null; import("https://nl4.dydra.com/javascripts/replication/rdf-graph-object.js").then(function(m) { rgo = m})
 rgo.defSparqlClass("https://nl4.dydra.com/james/cms/topics", console.log)
 topics
 var aTopic = new topics
 aTopic.objectEditor()
 aTopic.editObject({parent: document.querySelector('body')})

 // in observable
 var db = new GraphDatabase("nl4", "https://nl4.dydra.com/james/cms", secret("nl4/james/cms"), {})
 var store = db.createObjectStore("test");
 var 

${await sparqlObjectEditor("https://nl4.dydra.com/james/cms/topics", {
  style: { description: { height: '80pt', width: '400px' } },
  save: function(object) {
    console.log("to save", object);
  }
})}

sparqlPersistentObjectEditor(location, options) {
  var db = new GraphDatabase("nl4", "https://nl4.dydra.com/james/cms", secret("nl4/james/cms"), {})
  var store = db.createObjectStore("test");
  return new Promise(function(accept, reject) {
    GraphObject.getSparqlClass(location, function(sparqlClass) {
      var object = new sparqlClass();
      store.attach(object);
      accept(
        RDFGraphObject.editObject(object, options)
      );
    });
  });
}
*/