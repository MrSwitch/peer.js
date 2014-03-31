//
// PeerJS
// WebRTC Client Controler
// @author Andrew Dodson (@mr_switch)
// @since July 2012
//
require([
		'utils/getUserMedia',
		'utils/PeerConnection',
		'utils/RTCSessionDescription',
		'utils/events',

		'utils/extend',

		'utils/isEqual',
		'utils/isEmpty',

		'../bower_components/watch/src/watch',

		'lib/featureDetect',
		'lib/socket'
	],
	function(getUserMedia, PeerConnection, RTCSessionDescription, Events, extend, isEqual, isEmpty, Watch, featureDetect, socket){

	var watch = Watch.watch;

	var STUN_SERVER = "stun:stun.l.google.com:19302";


var peer = {

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
		socket.on('*', function(data){

			// propogate messages from the socket server to the app
			self.emit(data.type, data);
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
	// LocalMedia
	// 
	localmedia : null,

	//
	// AddMedia
	// 
	addMedia : function(callback){

		var self = this;

		// Do we already have an open stream?
		if(self.localmedia){
			callback(this.localmedia);
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
		};

		//
		// Has the callback been replaced with a stream
		//
		if(callback instanceof EventTarget){

			// User aded a media stream
			_success(callback);
			return this;
		}


		// Add callback
		if(callback){
			self.one('localmedia:connect', callback);
		}

		// Call it?
		getUserMedia({audio:true,video:true}, _success, function(e){
			// Trigger a failure
			self.emit('localmedia:failed', e);
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
			channel = this.channels[recipient];

		if( recipient && channel && channel.readyState==="open"){
			if(name){
				data.type = name;
			}
			channel.send(JSON.stringify(data));
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


	//
	// A collection of threads for which this user has connected
	threads : {},

	//
	// Thread connecting/changeing/disconnecting
	// Control the participation in a thread, by setting the permissions which you grant the thread.
	// e.g. 
	// thread( id string, Object[video:true] )  - send 'thread:connect'		- connects this user to a thread. Broadcasts 
	// thread( id string, Object[video:false] ) - send 'thread:change'		- connects/selects this user to a thread
	// thread( id string, false )				- send 'thread:disconnect'	- disconnects this user from a thread
	//
	//
	// Typical preceeding flow: init
	// -----------------------------
	// 1. Broadcasts thread:connect + credentials - gets other members thread:connect (incl, credentials)
	// 
	// 2. Receiving a thread:connect with the users credentials
	//		- creates a peer connection (if preferential session)
	//
	//		- taking the lowest possible credentials of both members decide whether to send camera*
	//
	// Thread:change
	// -----------------------------
	// 1. Updates sessions, updates other members knowledge of this client
	//		- Broadcasts thread:change + new credentials to other members.
	//		- ForEach peer connection which pertains to this session
	//			For all the threads which this peer connection exists in determine the highest possible credentials, e.g. do they support video
	//			Add/Remove remote + local video streams (depending on credentials). Should we reignite the Connection confifuration?
	//		- This looks at all sessions in the thread and determines whether its saf
	//
	thread : function(id, constraints){

		var init = false;

		if( typeof(id) === "object" ){
			if(!constraints){
				constraints = id;
			}

			// Make up a new thread ID if one wasn't given
			id = (Math.random() * 1e18).toString(36);
		}


		// Get the thread
		var thread = this.threads[id];

		// INIT
		// Else intiiatlize the thread
		if(!thread){

			// Create the thread object
			thread = this.threads[id] = {
				// initiate contraints
				constraints : {},
				// initiate sessions
				sessions : [],
				// initial state
				state : 'connect'
			};

			// init
			init = true;
		}


		//
		// CONSTRAINTS
		if( constraints === false ){

			// Update state
			delete this.threads[id];

			// DISCONNECT
			// broadcast a disconnect message to all members
			this.send("thread:disconnect", {
				thread : id
			});

			// Clear Up stream connections based on the change in the connections
			clearUpStreams();
			return;
		}
		else{
			// Update thread constraints
			for(var x in constraints){
				thread.constraints[x] = constraints[x];
			}
		}


		// Connect to a messaging group
		this.send("thread:"+(init ? 'connect' : 'change'), {
			thread : id,
			constraints : constraints
		});

		// Tidy streams
		clearUpStreams();

		return thread;
	},


	// A collection of Peer Connection streams
	streams : {},

	//
	// Stream
	// Establishes a connection with a user
	//
	stream : function( id, constraints, offer ){

		console.log("stream()", arguments);

		var self = this;

		// Operations
		// Once the RTCPeerConnection object has been initialized, for every call to createOffer, setLocalDescription, createAnswer and setRemoteDescription; execute the following steps:
		// Append an object representing the current call being handled (i.e. function name and corresponding arguments) to the operations array.
		// If the length of the operations array is exactly 1, execute the function from the front of the queue asynchronously.
		// When the asynchronous operation completes (either successfully or with an error), remove the corresponding object from the operations array. 
		//  - After removal, if the array is non-empty, execute the first object queued asynchronously and repeat this step on completion.


		var operations = [];
		function operation(func){

			// Add operations to the list
			if(func){
				operations.push(func);
			}
			else{
				console.log("STATE:", pc.signalingState);
			}

			// Are we in a stable state?
			if(pc.signalingState==='stable'){
				// Pop the operation off the front.
				var op = operations.shift();
				if(op){
					op();
				}
			}
			else{
				console.log("PENDING:", operations);
			}
		}
		
		// stream
		var stream = this.streams[id] || (this.streams[id] = {constraints:constraints}),
			pc = stream.pc;


		var config = { 'optional': [], 'mandatory': {
						'OfferToReceiveAudio': true,
						'OfferToReceiveVideo': true }};


		if(!pc){

			// Extend the stream with events
			Events.call(stream);

			// Listen for changes in the constraints
			watch( stream.constraints, ['video','data'], toggleLocalStream );

			// Peer Connection
			// Initiate a local peer connection handler
			var pc_config = {"iceServers": [{"url": self.stun_server}]},
				pc_constraints = {"optional": [{"DtlsSrtpKeyAgreement": true}]};
	//				stun = local ? null : Peer.stun_server;

			try{
				//
				// Reference this connection
				//
				stream.pc = pc = new PeerConnection(pc_config, pc_constraints);

				pc.onicecandidate = function(e){
					var candidate = e.candidate;
					if(candidate){
						self.send({
							type : 'stream:candidate',
							data : {
								label: candidate.label||candidate.sdpMLineIndex,
								candidate: candidate.toSdp ? candidate.toSdp() : candidate.candidate
							},
							to : id
						});
					}
				};
			}catch(e){
				console.error("Failed to create PeerConnection, exception: " + e.message);
				return;
			}

			pc.onsignalingstatechange = function(e){
				operation();
			};


			//pc.addEventListener("addstream", works in Chrome
			//pc.onaddstream works in FF and Chrome
			pc.onaddstream = function(e){
				e.from = id;
				self.emit('media:connect', e);
			};

			// pc.addEventListener("removestream", works in Chrome
			// pc.onremovestream works in Chrome and FF.
			pc.onremovestream = function(e){
				e.from = id;
				self.emit('media:disconnect', e);
			};

			// This should now work, will have to reevaluate
			self.on('localmedia:connect', toggleLocalStream);
			self.on('localmedia:disconnect', toggleLocalStream);

			if(!!self.localmedia){
				toggleLocalStream();
			}

			pc.ondatachannel = function(e){
				setupDataChannel(e.channel);
			};

			pc.onnegotiationneeded = function(e){
				pc.createOffer(function(session){
					pc.setLocalDescription(session, function(){
						self.send({
							type : "stream:offer",
							to : id,
							data : {
								offer : pc.localDescription
							}
						});
					}, errorHandler);

				}, null, config);
			};
		}


		// Is this an offer or an answer?
		// No data is needed to make an offer
		// Making an offer?
		if(!offer){

			// Create a datachannel
			// This initiates the onnegotiationneeded event
			var channel = pc.createDataChannel('data');
			setupDataChannel(channel);
		}
		// No, we're processing an offer to make an answer then
		else{

			// Set the remote offer information
			pc.setRemoteDescription(new RTCSessionDescription(offer), function(){
				pc.createAnswer(function(session){
					pc.setLocalDescription(session, function(){
						self.send({
							type : "stream:answer",
							to : id,
							data : pc.localDescription
						});
					},errorHandler);
				}, null, config);
			});
		}


		return stream;

		function errorHandler(e){
			console.log("SET Description fail triggered:",e);
		}

		//
		function setupDataChannel(channel){

			// Store
			self.channels[id] = channel;

			// Broadcast
			channel.onopen = function(e){
				e.id = id;
				self.emit("channel:connect", e);
			};
			channel.onmessage = function(e){
				e.id = id;
				self.emit("channel:message", e);
				messageHandler( e.data, id );
			};
			channel.onerror = function(e){
				e.id = id;
				self.emit("channel:error", e);
			};
		}

		function toggleLocalStream(){

			var media = peer.localmedia;

			if(pc.readyState==='closed'){
				console.log("PC:connection closed, can't add stream");
				return;
			}


			// Do the constraints allow for media to be added?
			if(!stream.constraints.video||!media){

				// We should probably remove the stream here
				pc.getLocalStreams().forEach(function(media){
					operation(function(){
						console.log("PC:removing local media", media);
						pc.removeStream(media);
					});
				});

				return;
			}

			console.log("PC:adding local media");

			// Set up listeners when tracks are removed from this stream
			// Aka if the streams loses its audio/video track we want this to update this peer connection stream
			// For some reason it doesn't... which is weird
			// TODO: remove the any tracks from the stream here if this is not a regular call.
			operation(function(){
				pc.addStream(media);
			});

			// Add event listeners to stream
			media.addEventListener('addtrack', function(e){
				// reestablish a track
				console.log(e);
				// Swtich out current stream with new stream
				//var a = pc.getLocalStreams();
				//console.log(a);
			});

			// Remove track
			media.addEventListener('removetrack', function(e){
				//var a = pc.getLocalStreams();
				console.log(e);
			});

		}

	},

	// CHANNELS
	// Trigger messages via channels to specific users
	channels : {},
	channel : function(id, message){
		// Get the peer connection
		var channel = this.channels[id];
		if(!channel){
			// there is no open channel for this session
			return false;
		}
		channel.send(message);
		return true;
	}
};


//
// Expose external
window.peer = peer;

//
// Expand the Peer object with events
Events.call(peer);

// EVENTS
// The "default:" steps maybe cancelled using e.preventDefault()

//
// Session:Connect
// When local client has succesfully connected to the socket server we get a session connect event, so lets set that
// 
peer.on('socket:connect', function(e){

	// Store the users session
	this.id = e.to;

	// Todo
	// If the user manually connects and disconnects, do we need 
});


//
// Thread:Connect (comms)
// When a user B has joined a thread the party in that thread A is notified with a thread:connect Event
// Party A replies with an identical thread:connect to party B (this ensures everyone connecting is actually online)
// Party B does not reply to direct thread:connect containing a "to" field events, and the chain is broken.
//
// Initiate (pc:offer)
// If recipient A has a larger SessionID than sender B then inititiate Peer Connection
peer.on('thread:connect', function(e){

	// It's weird that we should receive a connection to a thread we haven't already established a listener for
	// But it could be that the thread was somehow removed.
	var thread = peer.threads[e.thread] || peer.thread(e.thread, {video:false});

	// Add the sender to the internal list of thread sessions
	if(thread.sessions.indexOf(e.from) === -1){
		thread.sessions.push(e.from);
	}

	// SEND THREAD:CONNECT
	// Was this a direct message?
	if(!e.to){
		// Send a thread:connect back to them
		e.to = e.from;
		peer.send('thread:connect', e);
	}


	// STREAMS
	// Stream exist or create a stream
	var stream = peer.streams[e.from];

	if( !stream && e.from < peer.id ){

		// This client is in charge of initiating the Stream Connection
		// We'll do this off the bat of acquiring a thread:connect event from a user
		peer.stream( e.from, thread.constraints );
	}
	else if (stream){
		clearUpStreams();
	}
});


//
// Thread Change
// A client has updated their constraints, this changes what media can be sent
// Trigger stream changes
peer.on('thread:change', function(){
	// A member of a thread, has changed their permissions
});



//
// thread:disconnect
// When a member disconnects from a thread we get this fired
//
peer.on('thread:disconnect', function(e){

	// Get thread
	var thread = this.threads[e.thread],
		uid = e.from;

	// Thread
	if( thread && thread.sessions.indexOf(uid) > -1 ){
		thread.sessions.splice(thread.sessions.indexOf(uid), 1);
	}

	//
	// Tidy up the streams
	clearUpStreams();

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
peer.on('stream:offer', function(e){
	//
	// Offer
	var data = e.data,
		uid = e.from;

	// Constraints
	var constraints = getSessionConstraints( uid );

	//
	// Creates a stream:answer event
	this.stream( uid, constraints || {}, data.offer );

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
	// console.log('channel:message',e);
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

	var constraints = {},
		prop;

	// Loop through the active threads where does it exist?
	for(var threadID in peer.threads){

		// Thread
		var thread = peer.threads[threadID];

		// Does this stream exist in the thread?
		if(thread.constraints && thread.sessions.indexOf(sessionID)>-1){

			// Loop through this threads credentials
			for( prop in thread.constraints ){

				// If the credential property is positive use it otherwise use the default
				constraints[prop] = thread.constraints[prop] || constraints[prop];
			}
		}
	}
	return constraints;
}

});