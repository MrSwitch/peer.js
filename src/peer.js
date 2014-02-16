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

			self.localmedia = stream;

			// Vid onload doesn't seem to fire
			self.emit('localmedia:added',stream);
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
			self.on('localmedia:added', callback);

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

		// Count
		var callback_count = this.callback.length;

		// Array?
		if(!(data instanceof Array)){
			data = [data];
		}

		for(var i=0;i<data.length;i++){
			data[i] = data[i] || {};
			data[i].type = name;
			if(callback){
				data[i].callback = callback_count;
			}
		}

		// Add callback
		if(callback){
			this.callback.push(callback);
		}

		console.log("SEND: "+ name, data);

		this.on(!!this.id||'socket:connect', function(){
			self.socket.send(JSON.stringify(data));
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
			thread : id
		});

		return thread;
	},


	// A collection of Peer Connection streams
	streams : {},

	//
	// Stream
	// Establises a connection with a user
	//
	stream : function( id, constraints, data ){

		var self = this;

		// Callback
		var callback = function(candidate){
			if(!candidate){
				return;
			}
			self.send('stream:candidate',{
				data : {
					label: candidate.label||candidate.sdpMLineIndex,
					candidate: candidate.toSdp ? candidate.toSdp() : candidate.candidate
				},
				to : id
			});
		};


		// Peer Connection
		var pc,
			pc_config = {"iceServers": [{"url": self.stun_server}]},
			pc_constraints = {"optional": [{"DtlsSrtpKeyAgreement": true}]};
//				stun = local ? null : Peer.stun_server;
		try{
			pc = new PeerConnection(pc_config, pc_constraints);
			pc.onicecandidate = function(e){
				callback(e.candidate);
			};
		}catch(e){
			console.error("Failed to create PeerConnection, exception: " + e.message);
			return;
		}

		//pc.addEventListener("addstream", works in Chrome
		//pc.onaddstream works in FF and Chrome
		pc.onaddstream = function(e){
			e.from = id;
			self.emit('stream:media', e);
		};

		// pc.addEventListener("removestream", works in Chrome
		// pc.onremovestream works in Chrome and FF.
		pc.onremovestream = function(e){
			e.from = id;
			self.emit('stream:mediaRemoved', e);
		};

		// This should now work, will have to reevaluate
		self.on(!!self.localmedia || 'localmedia:added', function(){

			if(pc.readyState==='closed'){
				console.log("PC:connection closed, can't add stream");
				return;
			}
			console.log("PC:adding local media");

			// Do the constraints allow for media to be added?
			if(constraints.indexOf('video')){
				pc.addStream(self.localmedia);
			}
		});

		// Is this an offer or an answer?
		// No data is needed to make an offer
		var offer = !data;

		var config = { 'optional': [], 'mandatory': {
						'OfferToReceiveAudio': true,
						'OfferToReceiveVideo': true }};

		// Making an offer?
		if(offer){
			pc.createOffer(function(session){
				pc.setLocalDescription(session);

				self.send("session:offer",{
					"to" : id,
					"data" : {
						"sdp" : session
					}
				});

			}, null, config);
		}
		// No, we're processing an offer to make an answer then
		else{
			// Set the remote offer information
			pc.setRemoteDescription(new RTCSessionDescription(data.offer));
			pc.createAnswer(function(session){
				pc.setLocalDescription(session);

				self.send("session:answer",{
					"to" : id,
					"data" : {
						"sdp" : session
					}
				});

			}, null, config);
		}

		return pc;
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
	if(e.to){
		// Send a thread:connect back to them
		peer.send('thread:connect', {to:e.from});
	}


	// STREAMS
	// Stream exist or create a stream
	var stream = peer.streams[e.from];

	if( !stream && e.from < peer.id ){

		// This client is in charge of initiating the Stream Connection
		// We'll do this off the bat of acquiring a thread:connect event from a user
		peer.stream( e.from, thread.credentials );
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
	var offer = e.data;

	// Creates a stream:answer event
	this.stream( e.from, offer.constraints, offer.sdp );

});



//
// stream:answer
// 
peer.on('stream:answer', function(data){

	console.log("on:answer: Answer recieved, connection created");
	self.streams[data.from].setRemoteDescription( new RTCSessionDescription(data.answer) );

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
			callback();
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


})(document, window);