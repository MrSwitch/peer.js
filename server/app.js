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

		socket.on('message',function(data){
			log(data);
			peer.send(data);
		});
		socket.on('disconnect',function(){
			log({type:'disconnect'});
			peer.close();
		});

function log(data, out){

	if(typeof(data)==='string'){
		data = JSON.parse(data);
	}

	var color = '\x1b[93m-> %s\x1b[0m: \x1b[92m%s\x1b[0m ';
	if( out ){
		color = '\x1b[93m-> %s\x1b[0m: \x1b[92m%s\x1b[0m \x1b[96m%s -> \x1b[0m';
		console.log( color, (data.from || 'new'), data.type, peer.id);
	}
	else{
		console.log( color, peer.id, data.type );
	}

	console.log('\x1b[90m%s\x1b[0m', JSON.stringify(data, true, 2).replace(/(^\{\n|\}$)/g, '') );
}

	});
};