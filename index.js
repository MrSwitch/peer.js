var peer = require('./src/peer-server.js');

var connect = require('connect');
var server = connect().use( connect.static( __dirname + '/src') );
var port = process.env.PORT || 5000;

var http = server.listen(port);

// Start the peer server and bind listener
peer(http);

// Notify all has started
console.log("Peer.js server on port "+port);