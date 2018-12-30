// Copyright (c) 2019 datagraph gmbh


// orignally used
// https://github.com/kelektiv/node-uuid
// via
// import * as $uuid from 'https://wzrd.in/standalone/uuid%2Fv1@latest';
// but that server was not reliable
import * as $uuid from '/javascripts/vendor/uuid-v1.js';

//var sha1Lib = require('js-sha1');
//var uuidLib = require('uuid/v1');

var UUIDStateEnum = {
  insert: 0x00,
  delete: 0x80,
};

var RSIDTypeEnum = {sha1: 1, sha256: 2};
var RSIDType = RSIDTypeEnum.sha1;
var RSIDLength = 20;
var IDNode = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06];

export function makeUUID({msecs = (new Date().getTime())} = {}, buffer = []) {
  //if (msecs === undefined) { msecs = new Date().getTime(); }
  var uuid = $uuid.v1({node: IDNode, msecs: msecs}, buffer);
  return( uuid );
}
export function makeUUIDString() {
  var msecs = new Date().getTime();
  return ($uuid.v1({node: IDNode, msecs: msecs}, null));
}

export function copyUUID(uuid) {
  return( uuid.slice() );
}

// comparisons
// https://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript/14853974
// Warn if overriding existing method
if(Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;       
        }           
        else if (this[i] != array[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", {enumerable: false});


function UUIDState(uuid) {
  return( (uuid[6] & 0x80) ? UUIDStateEnum.delete : UUIDStateEnum.insert );
}

// https://github.com/krassif/node-uuid/commit/a9aac0e56f6c78b80454e9686e2eebcbbf724d45
function UUIDTimestamp(b) {
    var msec = 0, nsec = 0;
    var i = 0;

    // inspect version at offset 6
    if ((b[i+6]&0x10)!=0x10) {
      throw new Error("uuid version 1 expected"); }

    // 'time_low'
    var tl = 0;
    tl |= ( b[i++] & 0xff ) << 24;
    tl |= ( b[i++] & 0xff ) << 16;
    tl |= ( b[i++] & 0xff ) << 8;
    tl |=   b[i++] & 0xff ;

      // `time_mid`
      var tmh = 0;
      tmh |= ( b[i++] & 0xff ) << 8;
      tmh |=   b[i++] & 0xff;

      // `time_high_minus_version`
      tmh |= ( b[i++] & 0xf ) << 24; 
      tmh |= ( b[i++] & 0xff ) << 16;

      // account for the sign bit
      msec = 1.0 * ( ( tl >>> 1 ) * 2 + ( ( tl & 0x7fffffff ) % 2 ) ) / 10000.0;
      msec += 1.0 * ( ( tmh >>> 1 ) * 2 + ( ( tmh & 0x7fffffff ) % 2 ) ) * 0x100000000 / 10000.0;
      
      // Per 4.1.4 - Convert from Gregorian epoch to unix epoch
    msec -= 12219292800000;
      
    // getting the nsec. they are not needed now though 
    // nsec = ( tl & 0xfffffff ) % 10000;


    return msec;
}

function setUUIDState(uuid, state) {
  switch(state) {
    case UUIDStateEnum.insert : uuid[6] = (uuid[6] & 0x7f); break;
    case UUIDStateEnum.delete : uuid[6] = (uuid[6] | 0x80); break;
  }
  return( uuid );
}

function resetUUIDState(uuid) {
  setUUIDState(uuid, UUIDStateEnum.insert);
}

function isInsertUUID(uuid) {
  return( UUIDState(uuid) == UUIDStateEnum.insert );
}

function isDeleteUUID(uuid) {
  return( UUIDState(uuid) == UUIDStateEnum.delete );
}

function formatUUID(uuid) {
  var isInsert = isInsertUUID(uuid);
  var cleanUUID = setUUIDState(copyUUID(uuid), UUIDStateEnum.insert);
  var timestamp = UUIDTimestamp(uuid);
  var dateTime = new Date(timestamp);
  return( `${cleanUUID}${isInsert ? '+' : '-'}${dateTime.toISOString()}` );
}
