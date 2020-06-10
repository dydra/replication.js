#!/usr/bin/env node
var WebSocketClient = require('websocket').client;

var client = new WebSocketClient();

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("ws Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('ws Connection Closed');
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("ws Received: '" + message.utf8Data + "'");
        }
    });
    
    function sendRequest() {
        if (connection.connected) {
            connection.sendUTF("GET /james/public/service HTTP/1.1\r\nAccept: application/n-quads\r\n\r\n");
            setTimeout(sendRequest, 1000);
        }
    }
    sendRequest();
});

client.connect('ws://localhost:8104/ws');

