//
// Peer Server
// Requires Socket.IO
//
var socket = require("socket.io");

var Peer = require("./peer.js");



module.exports = function(app){

	var io=socket.listen(app);
//	io.enable('browser client minification');  // send minified client
	io.enable('browser client etag');          // apply etag caching logic based on version number
	io.enable('browser client gzip');          // gzip the file
	io.set('log level', 1);                    // reduce logging

	// This has to be run on port 80
	io.configure(function (){
		io.set("transports", ["xhr-polling"]);
		io.set("polling duration", 10);
	});


	//////////////////////////////////
	// Create a new Client
	//////////////////////////////////

	io.sockets.on('connection', function (socket) {

		var peer = new Peer( socket.id );

		// listen to outgoing messages from the thread
		peer.onmessage = function(data){

			// Send
			log( data, true );
			socket.send(JSON.stringify(data));
		};

		peer.send({
			type : 'socket:connect',
			to : socket.id,
			id : socket.id
		});

		socket.on('thread:connect', function(data){
			data.type = 'thread:connect';
			log(data);
			peer.send(data);
		});

		socket.on('thread:disconnect', function(data){
			data.type = 'thread:disconnect';
			log(data);
			peer.send(data);
		});
		socket.on('session:tag',function(data){
			data.type = 'session:tag';
			log(data);
			peer.send(data);
		});
		socket.on('session:watch',function(data){
			data.type = 'session:watch';
			log(data);
			peer.send(data);
		});
		socket.on('socket:disconnect',function(data){
			data.type = 'socket:disconnect';
			log(data);
			peer.send(data);
		});
		socket.on('message',function(data){
			log(data);
			peer.send(data);
		});
		socket.on('disconnect',function(){
			var data = {
				type : 'socket:disconnect'
			};
			log(data);
			peer.send(data);
		});

function log(data, out){

	if(typeof(data)==='string'){
		data = JSON.parse(data);
	}

	var color = '\x1b[93m%s\x1b[0m: \x1b[92m%s\x1b[0m';
	if( out ){
		color = '\x1b[96m%s\x1b[0m: \x1b[92m%s\x1b[0m';
	}

	console.log( color, ( out ? ' <-  ':'  -> ' ) + peer.id, data.type);
	console.log('\x1b[90m%s\x1b[0m', JSON.stringify(data, true, 2) );
}

	});
};