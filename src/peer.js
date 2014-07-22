//
// PeerJS
// WebRTC Client Controler
// @author Andrew Dodson (@mr_switch)
// @since July 2012
//


define([
	'./utils/events',

	'./utils/extend',

	'./utils/isEqual',
	'./utils/isEmpty',

	'./lib/featureDetect',
	'./lib/socket',

	'./models/threads',
	'./models/stream',
	'./models/localmedia'

], function(
	Events,
	extend,
	isEqual,
	isEmpty,
	featureDetect,
	socket,
	Threads,
	Streams,
	LocalMedia
){

	var STUN_SERVER = "stun:stun.l.google.com:19302";




var peer = Object.create(new Events());

extend( peer, {

	//
	// Initiate the socket connection
	//
	init : function(ws, callback){


		var self = this;

		// Connect to the service and let us know when connected
		socket.connect(ws, function(){
			// self.emit('socket:connect');
		});

		// Message
		socket.on('*', function(event_name, arg){
			console.log("Inbund:", event_name, arg );
			self.emit(event_name, arg);
		});

		// Loaded
		if(callback){
			this.one('socket:connect', callback);
		}


		return this;
	},

	//
	// Defaults
	stun_server : STUN_SERVER,

	//
	// DataChannel
	// 
	support : featureDetect,


	//
	// Send information to the socket
	//
	send : function(name, data, callback){

		//
		if (typeof(name) === 'object'){
			callback = data;
			data = name;
			name = null;
		}

		console.log("SEND: "+ name, data);

		var recipient = data.to,
			streams = this.streams[recipient];

		if( recipient && streams && streams.channel && streams.channel.readyState==="open"){
			if(name){
				data.type = name;
			}
			streams.channel.send(JSON.stringify(data));
			return;
		}

		socket.send(name, data, callback);

		return this;
	},


	/////////////////////////////////////
	// TAG / WATCH LIST
	//
	tag : function(data){

		if(!(data instanceof Array)){
			data = [data];
		}

		this.send('session:tag', data );

		return this;
	},


	//
	// Add and watch personal identifications
	//
	watch : function(data){

		if(!(data instanceof Array)){
			data = [data];
		}

		this.send('session:watch', data );

		return this;
	},

});




// Expose external
window.peer = peer;

// Extend with the thread management
Threads.call(peer);

// Extend with stream management
Streams.call(peer);

// Extend with local Media
LocalMedia.call(peer);


// EVENTS
// The "default:" steps maybe cancelled using e.preventDefault()

//
// Session:Connect
// When local client has succesfully connected to the socket server we get a session connect event, so lets set that
// 
peer.on('socket:connect', function(e){

	// Store the users session
	this.id = e.id;

	// Todo
	// If the user manually connects and disconnects, do we need 
});



function messageHandler(data, from){
	console.info("Incoming:", data);

	data = JSON.parse(data);

	if(from){
		data.from = from;
	}

	if("callback_response" in data){
		var i = data.callback_response;
		delete data.callback_response;
		peer.callback[i].call(peer, data);
		return;
	}

	var type = data.type;
	try{
		delete data.type;
	}catch(e){}

	peer.emit(type, data, function(o){
		// if callback was defined, lets send it back
		if("callback" in data){
			o.to = data.from;
			o.callback_response = data.callback;
			peer.send(o);
		}
	});
}




// Channels
peer.on('channel:connect', function(e){
	//
	// Process 
	// console.log('channel:connect',e);
});

// 
peer.on('channel:message', function(e){
	//
	// Process 
	messageHandler(e.data, e.id);
});



//
// BeforeUnload
//
window.onbeforeunload = function(){
	// Tell everyone else of the session close.
	if(socket){
		socket.disconnect();
	}
};


	return peer;

});