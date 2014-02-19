//
// PeerJS
// WebRTC Client Controler
// @author Andrew Dodson (@mr_switch)
// @since July 2012
//
(function(document, window){

	"use strict";

	// Does this browser support WebRTC?
	if(!navigator.getUserMedia){
		navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;
	}
	// URL?
	if(!window.URL){
		window.URL = window.webkitURL || window.msURL || window.mozURL || window.oURL;
	}
	if(!window.PeerConnection){
		window.PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
	}

	// Fix FF issue
	if(window.mozRTCSessionDescription){
		RTCSessionDescription = window.mozRTCSessionDescription;
	}


	var STUN_SERVER = "stun:stun.l.google.com:19302";



//
// Build Peer Object
//
var peer = {

	//
	// Initiate the socket connection
	//
	init : function(ws, callback){

		var self = this;

		// Loaded
		if(callback){
			this.on('socket:connect', callback);
		}

		// What happens on connect
		var onload = function(){

			// prevent duplicate
			onload = function(){};

			// Connect to the socket
			self.socket = io.connect( ws );

// Define an onload handler
			self.socket.on('message', function(data){
				console.info("Incoming:", data);

				data = JSON.parse(data);
				var type = data.type;
				try{
					delete data.type;
				}catch(e){}

				if("callback_response" in data){
					var i = data.callback_response;
					delete data.callback_response;
					self.callback[i].call(self, data);
					return;
				}

				self.emit(type, data, function(o){
					// if callback was defined, lets send it back
					if("callback" in data){
						o.to = data.from;
						o.callback_response = data.callback;
						self.socket.send(JSON.stringify(o));
					}
				});
			});
		};

		// Load SocketIO if it doesn't exist
		if(typeof(io)==='undefined'){

			// Load socketIO
			var script = document.createElement('script');
			script.src = (ws||'') + "/socket.io/socket.io.js";
			script.onreadystatechange= function () {
				if (this.readyState == 'complete') {
					onload();
				}
			};
			script.onload = onload;

			var ref = document.getElementsByTagName('script')[0];
			if(ref.parentNode){
				ref.parentNode.insertBefore(script,ref);
			}
		}

		return self;
	},

	//
	// Defaults
	stun_server : STUN_SERVER,

	//
	// DataChannel
	// 
	support : (function(){
		var pc, channel;
		try{
			// raises exception if createDataChannel is not supported
			pc = new PeerConnection( {"iceServers": [{"url": "stun:localhost"}] });
			channel = pc.createDataChannel('supportCheck', {reliable: false});
			channel.close();
		} catch(e) {}

		return {
			rtc : !!pc,
			datachannel : !!channel
		};
	})(),


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
			return self;
		}

		// Create a success callback
		// Fired when the users camera is attached
		var _success = function(stream){

			// Attach stream
			self.localmedia = stream;

			// listen for change events on this stream
			self.localmedia.onended = function(){

				// Detect the change
				if( !self.localmedia || self.localmedia === stream ){
					self.emit('localmedia:disconnect');
					self.localmedia = null;
				}

				// Loop through streams and call removeStream
				for(var x in self.streams){
					self.streams[x].removeStream(stream);
				}
			};

			// Vid onload doesn't seem to fire
			self.emit('localmedia:connect',stream);
		};

		// Trigger a failure
		var _failure = function(event){

			//
			self.emit('localmedia:failed', event);
		};


		if(callback instanceof EventTarget){

			// User aded a media stream
			_success(callback);

		}
		else{

			// Add callback
			self.on('localmedia:connect', callback);

			// Call it?
			try{
				navigator.getUserMedia({audio:true,video:true}, _success, _failure);
			}
			catch(e){
				try{
					navigator.getUserMedia('audio,video', _success, _failure);
				}
				catch(_e){
					_failure();
				}
			}

		}

		return self;
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

		// Add callback
		if(callback){
			// Count
			var callback_id = this.callback.length;
			this.callback.push(callback);
		}

		console.log("SEND: "+ name, data);

		this.one(!!this.id||'socket:connect', function(){
			if( name ){
				this.socket.emit(name, data, callback_id);
			}
			else{
				this.socket.send(JSON.stringify(data));
			}
		});

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



	// A collection of threads for which this user is connected
	threads : {},

	// A method for joining a thread
	thread : function(id, constraints){

		if( typeof(id) === "object" ){
			if(!constraints){
				constraints = id;
			}
			id = (Math.random() * 1e18).toString(36);
		}

		// Store constraints for this thread
		var thread = (this.threads[id] || (this.threads[id] = {}));
		thread.constraints = constraints;
		if(!thread.sessions){
			thread.sessions = [];
		}

		// Action
		thread.state = ( ! constraints ? "disconnect" : "connect");

		// Connect to a messaging group
		this.send("thread:"+thread.state, {
			thread : id,
			constraints : constraints
		});

		return thread;
	},


	// A collection of Peer Connection streams
	streams : {},

	//
	// Stream
	// Establises a connection with a user
	//
	stream : function( id, constraints, offer ){

		console.log("stream()", arguments);

		var self = this,
			pc = this.streams[id];


		var config = { 'optional': [], 'mandatory': {
						'OfferToReceiveAudio': true,
						'OfferToReceiveVideo': true }};


		if(!pc){

			// Peer Connection
			// Initiate a local peer connection handler
			var pc_config = {"iceServers": [{"url": self.stun_server}]},
				pc_constraints = {"optional": [{"DtlsSrtpKeyAgreement": true}]};
	//				stun = local ? null : Peer.stun_server;

			try{
				pc = new PeerConnection(pc_config, pc_constraints);
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

			//
			// Store this connection
			this.streams[id] = pc;


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
			self.on('localmedia:connect', addLocalStream);

			if(!!self.localmedia){
				addLocalStream();
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
					});

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
					});
				}, null, config);
			});
		}


		return pc;

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
			};
		}

		function addLocalStream(){
			if(pc.readyState==='closed'){
				console.log("PC:connection closed, can't add stream");
				return;
			}
			console.log("PC:adding local media");

			// Do the constraints allow for media to be added?
			if(constraints.indexOf('video')>-1){
				pc.addStream(self.localmedia);
			}
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
	var thread = peer.threads[e.thread] || peer.thread(e.thread, ['data']);

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
	// Determine whether all other threads to this user are disconnected
	for(var x in this.threads){
		thread = this.threads[x];
		if(thread.sessions.indexOf(uid)>-1){
			// The client resides in another thread
			// BREAK here
			return;
		}
	}

	//
	// Does the client have a stream to remove?
	// 
	if((uid in this.streams) && ("close" in this.streams[uid])){

		// Stream
		var stream = this.streams[uid];
		
		// create the event
		if(stream.dispatchEvent){
			var evt = document.createEvent('Event');

			// define that the event name is `build`
			evt.initEvent('removestream', true, true);
			stream.dispatchEvent(evt);
		}
		else if(stream.onremovestream){
			//self.streams[data.from].onremovestream();
		}

		// Cancel the peer connection stream
		stream.close();

		// Remove the stream
		delete this.streams[uid];
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
		uid = e.from,
		constraints = [];

	//
	// Get the threads which this connection is in
	// 
	for(var x in this.threads){
		var thread = this.threads[x];
		if(thread.sessions.indexOf(uid)>-1){
			// This user has set the following constraints on this thread.
			constraints = array_merge_unique(constraints, thread.constraints);
		}
	}

	//
	// Creates a stream:answer event
	this.stream( e.from, constraints, data.offer );

});



//
// stream:answer
// 
peer.on('stream:answer', function(e){

	console.log("on:answer: Answer recieved, connection created");
	this.streams[e.from].setRemoteDescription( new RTCSessionDescription(e.data) );

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

	stream.addIceCandidate(candidate);
});


// Channels
peer.on('channel:connect', function(e){
	//
	// Process 
	console.log('channel:connect',e);
});

// 
peer.on('channel:message', function(e){
	//
	// Process 
	console.log('channel:message',e);
});



//
// BeforeUnload
//
window.onbeforeunload = function(){
	// Tell everyone else of the session close.
	if(peer.socket){
		peer.socket.disconnect();
	}
};





// EVENTS
// Extend the function we do have.
function Events(){

	this.events = {};
	this.callback = [];

	// Return
	this.on = function(name, callback){

		// If there is no name
		if(name===true){
			callback.call(this);
		}
		else if(typeof(name)==='object'){
			for(var x in name){
				this.on(x, name[x]);
			}
		}
		else if (name.indexOf(',')>-1){
			for(var i=0,a=name.split(',');i<a.length;i++){
				this.on(a[i],callback);
			}
		}
		else {
			console.log('Listening: ' + name);

			if(callback){
				// Set the listeners if its undefined
				if(!this.events[name]){
					this.events[name] = [];
				}

				// Append the new callback to the listeners
				this.events[name].push(callback);
			}
		}

		return this;
	};

	// One
	// One is the same as On, but events are only fired once and must be reestablished afterwards
	this.one = function(name, callback){
		var self = this;
		this.on(name, function once(){ self.off(name,once); callback.apply(self, arguments);} );
	};

	// Trigger Events defined on the publisher widget
	this.emit = function(name,evt,callback){
		var self = this;

		if(!name){
			throw name;
		}
		var preventDefault;
		// define prevent default
		evt = evt || {};
		evt.preventDefault = function(){
			preventDefault = true;
		};

		console.log('Triggered: ' + name);
		if(this.events[name]){
			this.events[name].forEach(function(o,i){
				if(o){
					o.call(self,evt,callback);
				}
			});
		}
		
		// Defaults
		if(!preventDefault && "default:"+name in this.events){
			console.log('Triggered: default:' + name);
			this.events["default:"+name].forEach(function(o,i){
				if(o){
					o.call(self,evt,callback);
				}
			});
		}

		return this;
	};

	// Remove a callback
	this.off = function(name, callback){
		if(this.events[name]){
			for( var i=0; i< this.events[name].length; i++){
				if(this.events[name][i] === callback){
					this.events[name][i] = null;
				}
			}
		}
	};
}


function array_merge_unique(a,b){
	for(var i=0;i<b.length;i++){
		if(a.indexOf(b[i])===-1){
			a.push(b[i]);
		}
	}
	return a;
}

})(document, window);