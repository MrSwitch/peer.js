//
// Peer Server
// Requires Socket.IO
//
var Server = require("socket.io");
var Peer = require("./server/peer.js");



module.exports = function(app){

	var io = Server(app);
	// io.enable('browser client minification');  // send minified client
	// io.enable('browser client etag');          // apply etag caching logic based on version number
	// io.enable('browser client gzip');          // gzip the file
	io.set('log level', 1);                    // reduce logging

	// // This has to be run on port 80
	// io.configure(function (){
	//  io.set("transports", ["xhr-polling"]);
	//  io.set("polling duration", 10);
	// });


	//////////////////////////////////
	// Create a new Client
	//////////////////////////////////

	io.sockets.on('connection', function (socket) {

		var peer = new Peer( socket.id );

		// listen to outgoing messages from the thread
		peer.onmessage = function(data){

			// Log
			log( (data.from || 'new'), data.type, peer.id, data );

			// 
			socket.send(JSON.stringify(data));
		};

		peer.send({
			type : 'socket:connect',
			to : socket.id,
			id : socket.id
		});

		socket.on('message',function(data){
			data = JSON.parse(data);
			log( peer.id, data.type, null, data );
			peer.send(data);
		});

		socket.on('disconnect',function(){
			log( peer.id, 'disconnect' );
			peer.close();
		});

	});
};


function log(from, type, to, data){

	console.log( log.LABEL, from, type, to||'' );
	if(data){
		console.log( log.DATA, JSON.stringify(data, true, 2).replace(/(^\{\n|\}$)/g, '') );
	}
}

log.LABEL = '\x1b[93m-> %s\x1b[0m: \x1b[92m%s\x1b[0m \x1b[96m%s -> \x1b[0m';

log.DATA = '\x1b[90m%s\x1b[0m';