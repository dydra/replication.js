// Copyright (c) 2019 datagraph gmbh

var make = function(className, args = {}) {
  var op = constructors[className] || 
    (constructors[className] = new Function("return( new " + className + "() );"));
  var instance = op.call();
  Object.keys(args).map(function(key) { instance[key] = args[key]; });
  return( instance );
}

Array.prototype.last = function() {
    return this[this.length-1];
}

var makeResource = function(uri, statements) {
  var classId = quadObject(findQuad(isTypeQuad, statements));
  make(iriToClass(classId), statements);
}

