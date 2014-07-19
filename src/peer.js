//
// PeerJS
// WebRTC Client Controler
// @author Andrew Dodson (@mr_switch)
// @since July 2012
//


define([
	'./utils/getUserMedia',
	'./utils/PeerConnection',
	'./utils/RTCSessionDescription',
	'./utils/events',

	'./utils/extend',

	'./utils/isEqual',
	'./utils/isEmpty',

	'../bower_components/watch/src/watch',

	'./lib/featureDetect',
	'./lib/socket',

	'./models/threads',
	'./models/stream'
], function(
	getUserMedia,
	PeerConnection,
	RTCSessionDescription,
	Events,
	extend,
	isEqual,
	isEmpty,
	Watch,
	featureDetect,
	socket,
	Threads,
	Stream
){

	var watch = Watch.watch;

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
		socket.on('*', self.emit.bind(self) );

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
	// LocalMedia
	// 
	localmedia : null,

	//
	// AddMedia
	// 
	addMedia : function(successHandler, failHandler){

		var self = this;

		// Do we already have an open stream?
		if(self.localmedia){
			successHandler(this.localmedia);
			return this;
		}

		// Create a success callback
		// Fired when the users camera is attached
		var _success = function(stream){

			// Attach stream
			self.localmedia = stream;

			// listen for change events on this stream
			stream.onended = function(){

				// Detect the change
				if( !self.localmedia || self.localmedia === stream ){
					self.emit('localmedia:disconnect', stream);
					self.localmedia = null;
				}
			};

			// Vid onload doesn't seem to fire
			self.emit('localmedia:connect',stream);

			successHandler(stream);
		};

		//
		// Has the callback been replaced with a stream
		//
		if(successHandler instanceof EventTarget){

			// User aded a media stream
			_success(successHandler);
			return this;
		}


		// Call it?
		getUserMedia({audio:true,video:true}, _success, function(e){
			// Trigger a failure
			self.emit('localmedia:failed', e);
			failHandler();
		});


		return this;
	},

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



	// A collection of Peer Connection streams
	streams : {},

	//
	// Stream
	// Establishes a connection with a user
	//
	stream : function( id, constraints, offer ){

		console.log("stream", arguments);

		var self = this;

		if(!id){
			throw 'streams(): Expecting an ID';
		}
		
		// Get or set a stream
		var stream = this.streams[id];

		if(!stream){
			//
			// Create a new stream
			//
			stream = this.streams[id] = Stream(id, constraints, this.stun_server, this );

			// Output pupblished events from this stream
			stream.on('*', self.emit.bind(self) );

			// Control
			// This should now work, will have to reevaluate
			self.on('localmedia:connect', stream.addStream);
			self.on('localmedia:disconnect', stream.removeStream);

			//
			// Add the current Stream
			if(self.localmedia){
				stream.addStream(self.localmedia);
			}
		}

		// intiiate the PeerConnection controller
		// Add the offer to the stream
		stream.open(offer);
	}
});


//
// Expose external
window.peer = peer;

// Extend with the thread management
Threads.call(peer);


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


//
// Thread:Connect (comms)
// Initiate (pc:offer)
// If recipient A has a larger SessionID than sender B then inititiate Peer Connection
peer.on('thread:connect', function(e){

	// Was this a remove connection?

	if( e.from ){

		// It's weird that we should receive a connection to a thread we haven't already established a listener for
		var thread = peer.threads[e.thread];

		// STREAMS
		// Stream exist or create a stream
		var stream = peer.streams[e.from];

		// If the stream doesn't exist
		// This client has the a larger random string
		if( !stream && e.from < peer.id ){

			// This client is in charge of initiating the Stream Connection
			// We'll do this off the bat of acquiring a thread:connect event from a user
			peer.stream( e.from, thread.constraints );
		}
	}

});


//
// Thread Change
// If the local client has changed their credentials
//

peer.on('thread:change, thread:connect, thread:disconnect', function(e){

	// Is this local

	if( !e.from ){

		// Update the data which is being applied to streams
		// aka Add/Remove from a stream depending on the threads which they are both a part of.

		clearUpStreams();	
	}

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


peer.on('localmedia:disconnect', function(stream){
	// Loop through streams and call removeStream
	for(var x in this.streams){
		this.streams[x].pc.removeStream(stream);
	}
});


//////////////////////////////////////////////////
// STREAMS
//////////////////////////////////////////////////


//
// stream:offer
// A client has sent a Peer Connection Offer
// An Offer Object:
//  -  string: SDP packet, 
//  -  string array: contraints
//
peer.on('stream:offer,stream:makeoffer', function(e){
	//
	// Offer
	var data = e.data,
		uid = e.from;

	// Constraints
	var constraints = getSessionConstraints( uid );

	//
	// Creates a stream:answer event
	this.stream( uid, constraints || {}, data && data.offer );

});



//
// stream:answer
// 
peer.on('stream:answer', function(e){

	console.log("on:answer: Answer recieved, connection created");
	this.streams[e.from].pc.setRemoteDescription( new RTCSessionDescription(e.data) );

});


// not sure what ICE candidate is for
peer.on('stream:candidate', function(e){

	var uid = e.from,
		data = e.data,
		stream = this.streams[uid];

	if(!stream){
		console.error("Candidate needs initiation");
		return;
	}

	var candidate = new RTCIceCandidate({
		sdpMLineIndex	: data.label,
		candidate		: data.candidate
	});

	stream.pc.addIceCandidate(candidate);
});

// 
// A client notifies the third party that their constraints have changed by sending a stream:change event
// 
peer.on('stream:remoteconstraints', function(e){
	var uid = e.from;
	var stream = this.streams[uid];
	extend( stream.remoteconstraints, e.data);
});





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







//
// For all the active streams determine whether they are still needed
// Loop through all threads
// Check the other threads which they are in and determine whether its appropriate to change the peer connection streams
function clearUpStreams(){

	// EACH STREAM
	for( var sessionID in peer.streams ){

		//
		// Gets the constraints for the client's ID
		var constraints = getSessionConstraints(sessionID);

		//
		// EOF, obtained highest constraints for this connection
		// /////////////////////////////////

		var stream = peer.streams[sessionID];

		// Update the existing constraints on this stream
		extend( stream.constraints, constraints );
	}
}

// ///////////////////////////////
// Constraints
// Returns an Object of the connection constraints

function getSessionConstraints(sessionID){

	var constraints = {
			video : false,
			data : false
		},
		prop;

	// Loop through the active threads where does it exist?
	for(var threadID in peer.threads){

		// Thread
		var thread = peer.threads[threadID];

		// Does this stream exist in the thread?
		if(thread.constraints && thread.sessions.indexOf(sessionID)>-1){

			// Loop through the contraints on this thread credentials
			for( prop in thread.constraints ){

				// If the credential property is positive use it otherwise use the default
				constraints[prop] = thread.constraints[prop] || constraints[prop];
			}
		}
	}
	return constraints;
}

	return peer;

});