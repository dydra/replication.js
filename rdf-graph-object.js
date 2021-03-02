// Copyright (c) 2019 datagraph gmbh

import {getResource} from './resource-access.js';
import {GraphObject} from './graph-object.js';
import { makeUUIDString } from './revision-identifier.js';

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
        for (let [mode, assertions] of Object.entries(patch)) {
            rdfPatch[mode] = self.assertionStatements(assertions);
        }
        return (rdfPatch);
    }

    assertionStatements(assertions) {
        var propertyPredicateMap = this.propertyPredicateMap;

        function assertionStatement(assertion) {
            var [subject, name, value] = assertion;
            var predicate = propertyPredicateMap.get(name);
            if (!predicate) {
                throw new Error(`field predicate unknown: ${name}`);
            }
            return ([subject, pedicate, object]);
        }
        return (statements.map(assertionStatement));
    }

}

RDFGraphObject.prototype.propertyPredicateMap = new Map();

/**
   Given a location which designates a sparql view, retrieve the json encoding
   and compute from it the equivalent graph-object definition.

   @param {string} location
*/

export function getSparqlClass(location, continuation) {
    var locationUri = new URL(location);
    var className = locationUri.pathname.split('/').pop();
    var statementPatterns = [];
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

    function computeClass(sparqlDefinition) {
        //sparqlClass.prototype = Object.create(GraphObject.prototype);
        //sparqlClass.prototype.constructor = sparqlClass;
        //Object.setPrototypeOf(sparqlClass, GraphObject.prototype);
    
        var propertyDefinitions = {};
        var propertyNames = [];
        var propertyMap = new Map();
        console.log("extracting...", className);
        extractPatterns(sparqlDefinition);
        console.log("statementPatterns", statementPatterns);

        for (var pattern of statementPatterns) {
            var predicate = pattern.predicate;
            var object = pattern.object;
            if (object.termType == 'Variable') {
                var name = object.value;
                var url = predicate.value;
                var descriptor = Object.create(null);
                descriptor.writable = true;
                descriptor.value = undefined;
                descriptor.enumerable = true;
                propertyNames.push(name);
                propertyDefinitions[name] = descriptor;
                propertyMap.set(name, url);
            }
        }
        const sparqlClass =
            {[className]: class extends RDFGraphObject {
                constructor() {
                    super();
                    console.log("constructor", className, this, propertyDefinitions);
                    for (let [name, descriptor] of Object.entries(propertyDefinitions)) {
                        Object.defineProperty(this, name, descriptor);
                    }
                }}} [className];
        sparqlClass._persistentProperties = propertyNames;
        sparqlClass._transactionalProperties = propertyNames;
        sparqlClass.prototype.propertyPredicateMap = propertyMap;
        continuation(sparqlClass);
    }
    getResource(location, {"Accept": 'application/sparql-query+json'}, computeClass);
}


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

RDFGraphObject.objectEditor = function(object, options = {}) {
    console.log("RDFGraphObject.objectEditor: ", object, options);
    options = options || {};
    var fieldsElement = document.createElement('div');
    var row = 1;
    var editedElements = {};
    var allElements = {};
    var labelWidth = 40;
    var valueWidth = 100;
    var elementWidth = 0;
    var elementHeight = 20;
    var elementHeights = 0;
    var gridPad = 8;
    var pixelsPerCharacter = 10;
    var editableProperties = object.editableProperties();
    var classStyle = object.constructor.objectEditorCss;
    var optionsStyle = options.style;
    console.log("styles", classStyle, optionsStyle);

    function addFieldElements(key) {
        var value = object[key] || "";
        var definition = Object.getOwnPropertyDescriptor(object, key);
        var editable = (definition ? definition.writable : false)
        var element = document.createElement('div');
        var labelElement = document.createElement('div');
        var valueElement = document.createElement('div');
        var valueStyle = Object.assign({}, classStyle[key]||{}, optionsStyle[key]||{});
        
        labelElement.innerText = key;
        labelWidth = Math.max(labelWidth, (key.length +2) * pixelsPerCharacter);
        labelElement.className = "editorLabel";
        labelElement.style.cssText = "display: block; height: 8px; font-size: 8pt; padding: 0; position: absolute; right: 6px; top: -8px;";
        valueElement.className = "editorValue";
        valueElement.style.textAlign =  "left";
        valueElement.style.height =  "16px";
        for (var [property, cssValue] of Object.entries(valueStyle)) {
          valueElement.style[property] = cssValue;
        };
        var styleWidth = Number.parseInt(valueElement.style.width || "0px");
        console.log("addFieldElements: ", key, value, editable, valueStyle);
        
        valueElement.contentEditable = true;
        setElementText(valueElement, value);
        allElements[key] = valueElement;
        valueWidth = Math.max(valueWidth, (valueElement.innerText.length * pixelsPerCharacter), styleWidth)
        valueElement.addEventListener("keyup", function(event) {
            if (valueElement.contentEditable=="true") {
                if (!editedElements[key]) { editedElements[key] = valueElement; }
            }
        });
        element.style.cssText = "position: relative; top: 0; left: 0; grid-column: 1; border-bottom: solid 1px gray;";
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
        editableProperties.forEach(function(key) {
          setElementText(allElements[key], object[key]);
          delete editedElements[key];
        });
    }
    function updateObject() {
        console.log("doupdate");
        var count = 0;
        function saveElement(key) {
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
        console.log("edited", editedElements);
        Object.keys(editedElements).forEach(saveElement);
        return (count);
    }
    editableProperties.forEach(addFieldElements);    
    fieldsElement.id = object.id || makeUUIDString();
    fieldsElement.updateObject = updateObject;
    fieldsElement.setObject = setObject;
    fieldsElement.style.display = "grid";
    fieldsElement.style.gridTemplateRows = `repeat(${row-1}, auto)`;
    fieldsElement.style.gridTemplateColumns = "1";
    // augment and/or override css
    for (var [property, value] of Object.entries(object.constructor.objectEditorCss)) {
        if (! editableProperties.includes(property)) {
            fieldsElement.style[property] = value;
        }
    }
    
    elementWidth = Math.max(labelWidth, valueWidth);
    // console.log("widths: ", labelWidth, valueWidth);
    fieldsElement.querySelectorAll('.editorValue').forEach(function(elt) {
            console.log("sum heights", elt, elt.style.height, gridPad);
            elementHeights += (Number.parseInt(elt.style.height) + gridPad);
            elt.style.width = elementWidth +"px";
            elt.parentNode.style.width = elt.style.width;
        });
    fieldsElement.style.width = (valueWidth +4) + "px";
    fieldsElement.style.height = elementHeights + "px";
    fieldsElement.style.paddingTop = "6px";
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

RDFGraphObject.editObject = function(object, options = {}) {
    var fieldsElement = this.objectEditor(object, options);
    var frame = document.createElement('div');
    var controls = document.createElement('div');
    var get = document.createElement('span');
    var save = document.createElement('span');
    var cancel = document.createElement('span');
    var idElement = document.createElement('span');
    var id = makeUUIDString();
    var [x, y] = options.coordinates || [0,0];
    var dragCount = 0;
    var saveOp = options.save || console.log;
    var loadOp = options.load || (function(object) { return (new object.constructor()) });

    function dragFrame(event) {
        if (0 == dragCount ++) {
          frame.parentNode.addEventListener("drop", dropFrame);
        }
        event.dataTransfer.setData("text/plain+optionsposition", [event.layerX,event.layerY].toString());
        event.dataTransfer.setData("text/plain+id", event.target.id);
        event.dataTransfer.dropEffect = "move";
        // console.log("dragging: ", event);
    }
    function dropFrame(event) {
        var position = /(\d+),(\d+)/.exec(event.dataTransfer.getData("text/plain+optionsposition"))
        .slice(1).map(function(s) {return (Number.parseInt(s))});
        var id = event.dataTransfer.getData("text/plain+id");
        // console.log("dropFrame: ", event, position);
        if (position && id) {
            event.preventDefault();
            var droppedPane = section.querySelector('#'+id);
            droppedPane.style.top = (event.clientY - position[1])+"px";
            droppedPane.style.left = (event.clientX - position[0])+"px";
        }
    }
    function doGet(event) {
        object = loadOp(object);
        fieldsElement.setObject(object);
    }
    function doSave(event) {
        console.log("dosave");
        if (fieldsElement.updateObject() > 0) {
          saveOp(object);
        }
    }
    function doClose(event) {
        frame.parentNode.removeChild(frame);
        if (dragCount > 0) {
          frame.parentNode.removeEventListener("drop", dropFrame);
        }
    }

    frame.id = '_' + id;
    frame.style.position = options.position || "relative";
    frame.style.display = options.display || "block";
    frame.style.border = "dotted 1px gray";
    frame.style.top = y + "px";
    frame.style.left = x + "px";
    frame.style.height = "auto";
    frame.style.width = (Number.parseInt(fieldsElement.style.width)+4) +"px";
    frame.draggable = "true";
    controls.style.backgroundColor = "#f0f0f0";
    get.style.margin ="2px";
    get.style.border = "solid 1px gray";
    get.innerText = "get";
    save.style.margin ="2px";
    save.style.border = "solid 1px gray";
    save.innerText = "save";
    cancel.style.margin ="2px";
    cancel.style.border = "solid 1px gray";
    cancel.innerText = "cancel";
    idElement.contentEditable = true;
    idElement.style.margin ="2px";
    idElement.style.borderBottom = "solid 1px red";
    idElement.style.width = "auto";
    
    frame.appendChild(fieldsElement);
    frame.appendChild(controls);
    controls.appendChild(get);
    controls.appendChild(save);
    controls.appendChild(cancel);
    controls.appendChild(idElement);

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
    cancel.addEventListener("click", doClose);
    
    return (frame);
}


/**
   Generate a html presentation for the instance
   
   @param {object} options
*/

RDFGraphObject.prototype.objectEditor = function(options = {}) {
    return (this.constructor.objectEditor(this, options));
}

/**
   Generate a html presentation for the instance
   
   @param {object} options
*/

RDFGraphObject.prototype.editObject = function(options = {}) {
    return (this.constructor.editObject(this, options));
}



// var rgo = null; import("https://nl4.dydra.com/javascripts/replication/rdf-graph-object.js").then(function(m) { rgo = m})
// rgo.defSparqlClass("https://nl4.dydra.com/james/cms/topics", console.log)
// topics
// var aTopic = new topics
// aTopic.objectEditor()
// aTopic.editObject({parent: document.querySelector('body')})