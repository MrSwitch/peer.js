//
//
// WebRTC Client Controler
// @author Andrew Dodson (@mr_switch)
// @since July added the  
//
(function(document, window){

	// Switch between development and production
	var host, local = false;
	if(window.location.hostname.match(/local/)){
		var local = true;
		host = window.location.hostname + ':5000';
		console.log("This is running on a local environment and automatically assumes you have Node app.js running on port 5000");
	}

	// An internal Queue for delaying the load
	var Queue = new Events();


	// Load SocketIO if it doesn't exist
	if(typeof(io)==='undefined'){
		var script = document.createElement('script');
		script.src = (host ? 'http://' + host : '') + "/socket.io/socket.io.js";
		script.onreadystatechange= function () {
			if (this.readyState == 'complete') {
				Queue.trigger('loaded');
			}
		}
		script.onload= function(){
			Queue.trigger('loaded');
		};
		var ref = document.getElementsByTagName('script')[0];
		if(ref.parentNode){
			ref.parentNode.insertBefore(script,ref);
		}
	}

	// Define the location  of the socket IO server
	var ws = 'ws://' + (host ? host : window.location.hostname);


	// Does this browser support WebRTC?
	navigator.getUserMedia || (navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

	// URL?
	window.URL || (window.URL = window.webkitURL);

	// RTC Peer
	// I think this is a new standard coming in a beta Chrome
	var RTCPeer = true;

	// This is the massive Nut that holds it together
	// But because its so ugly we are hiding it out of our code.
	// This creates instances of a new PeerConnection
	function PeerConnection(callback){
		var pc, 
			pc_config = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]},
 			stun = local?null:"STUN stun.l.google.com:19302";
		try{
			pc = new webkitRTCPeerConnection(pc_config);
			pc.onicecandidate = function(e){
				callback(e.candidate);
			};
		}catch(e){
			try {
				pc = new webkitPeerConnection00(stun, callback);
				RTCPeer = false;
			} catch (e) {
				console.error("Failed to create PeerConnection, exception: " + e.message);
			}
		}
		return pc;
	}



	// EVENTS
	// Extend the function we do have.
	function Events(){

		this.events = {};

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
				console.log('ATTACHED: ' + name);

				if(callback){
					// Set the listeners if its undefined
					this.events[name] || (this.events[name] = []);

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
			this.on(name, function once(){ self.off(name,once); callback.apply(this, arguments);} );
		}		

		// Trigger Events defined on the publisher widget
		this.trigger = function(name,evt){
				console.log('Triggered: ' + name);
				if(this.events[name]){
					this.events[name].forEach(function(o,i){
						o(evt);
					});
				}

				return this;
		};

		// Remove a callback
		this.off = function(name, callback){
			if(this.events[name]){
				for( var i=0; i< this.events[name].length; i++){
					if(this.events[name][i] === callback){
						this.events[name].splice(i,1);
					}
				}
			}
		}
	};


	TB = {};

	TB.LocalMedia = function( rplElm ){

		if(!(this instanceof TB.LocalMedia)){
			return new TB.LocalMedia(rplElm);
		}

		Events.apply(this, arguments);

		var self = this;

		// Search for the element to replace
		if(typeof rplElm === 'string'){
			var el = document.getElementById(rplElm);
			if(!el){
				el = document.querySelector(rplElm);
			}
			rplElm = el;
		}


		// Is the item in a video element?
		if(rplElm.tagName.toLowerCase() !== 'video'){
			this.el = document.createElement('video');
			rplElm.appendChild(this.el);
		}
		else{
			this.el = rplElm;
		}

		// Set AutoPlay
		this.el.autoplay = true;

		// Create a success callback
		// Fired when the users camera is attached
		var _success = function(stream){

			// Attach the stream to the UI
			self.el.src = URL ? URL.createObjectURL(stream) : stream;

			// Save stream to element
			self.stream = stream;

			// Add an error event
			self.el.onerror = function(event) {
				stream.stop();
				self.trigger('failure', event);
			};

			// Trigger any success listeners.
			self.el.onload = function(){
				self.trigger('success', event);
			};

			// Vid onload doesn't seem to fire
			self.trigger('started', stream);
		};

		// Trigger a failure
		var _failure = function(event){
			self.trigger('failure', event);
		};

		this.connect = function(callback){

			if(this.stream){
				callback(this.stream);
				return this;
			}

			// Add callback
			self.on('started,failure', callback);

			// Call it?
			try{
				navigator.getUserMedia({audio:true,video:true}, _success, _failure);
			}
			catch(e){
				try{
					navigator.getUserMedia('audio,video', _success, _failure);
				}
				catch(e){
					_failure();
				}
			}
			return this;
		}

		return this;
	};


	// initSession
	// Create a New Peer Session
	TB.initSession = function(sessionId, apiKey, token){

		// Lets force a new instance
		if(!(this instanceof TB.initSession)){
			return new TB.initSession(sessionId, apiKey, token);
		}

		// Apply on,trigger
		Events.apply(this, arguments);

		
		var socket,
			localStream;

		// We dont need to make these publicly avaliable
		// but what the heck, maybe its useful
		this.streams = {};

		var self = this;

		// Add listeners for new messages
		this.connect = function(video){

			Queue.on(typeof(io)!=='undefined'||'loaded', function(){
				// Given a video tag
				// Broadcast to all parties the new stream
				socket = io.connect( ws );
				socket.emit('register', sessionId );

				// Define an onload handler
				socket.on('message', function(data){
					console.info("ws// Received Message " + data);

					data = JSON.parse(data);

					self.trigger(data.type,data);
				});
			});

			return this;
		};

		// Publish a new LocalMedia object
		this.addMedia = function(media){
			// Given a Media object, aka a video stream
			// Add it to the run or watch list
			media.on( !!media.stream || 'started', function(){
				localStream = media.stream;
				// Socket
				self.trigger('mediaAdded', media);
			});

			return this;
		};

		// Send message
		this.send = function(o){
			console.log("Sending: "+ o.type);
			socket.send(JSON.stringify(o));
			return this;
		};

		// Send an invite for the other client(s) to connect with this app?
		this.invite = function(id){

			this.one(!!localStream || 'mediaAdded', function(){
				self.send({
					type : 'invite',
					to : id
				});
			});

			return this;
		};

		this.accept = function(id){

			// If the local steam doesn exist then listen to mediaAdded event
			this.one(!!localStream || 'mediaAdded', function(){
				self.trigger('accept'+id);
			});

			return this;
		};


		// EVENTS

		// When your client first connects you recieve a sessionConnected Event
		this.on('sessionConnected', function(data){
			// Assign local id
			self.id = data.from;
		});


		// When someone disconnects you get this fired
		this.on('connectionDestroyed', function(){

		});


		//
		// 1. connectionCreated
		//
		// When someone else connects we get a stream created event from them
		this.on('connectionCreated', function(data){

			if(!("to" in data)){
				// send one back
				socket.send(JSON.stringify({
					type : 'connectionCreated',
					to : data.from
				}));
			}

			// this could have a default of making a connection,
			// This can be useful if there is no need to add media before.

			// I guess when this is ready we could Add Media as required
		});


		//
		// 2. streamAvailable
		//
		// When another client starts publishing they send a streamAvailable event.
		// This client then responds requesting an OFFER
		this.on('invite', function(data){

			// Received a connectionCreated event
			// Get their stream?
			self.one('accept'+data.from, function(){
				self.send({
					type : 'requestOffer',
					to : data.from
				});
			});
		});


		//
		// 3. requestOffer
		//
		// A client has sent a directMessage to connect to this client
		// We obtain an OFFER from the STUN server
		// And post it back to the other client
		this.on('requestOffer', function(data){

			// Do we have a localStream?
			if(!localStream){
				console.error('Something went wrong, a stream must\'ve been ditched');
				return;
			}

			// Do we already have a PeerConnection for this user
			if(data.from in self.streams){
				// A peer connection for this user has already been created
				// This request is going to be ignored
				console.error("Offer/Answer already sent, only one party can do this");
				return;
			}


			// Create a new PeerConnection
			console.log("Creating PeerConnection");
			var pc = self.streams[data.from] = PeerConnection(function(candidate){
				if(!candidate){
					return;
				}
				self.send({
					type: 'candidate',
					label: candidate.label||candidate.sdpMLineIndex, 
					candidate: candidate.toSdp ? candidate.toSdp() : candidate.candidate
				});
				return;
			});

			pc.addEventListener("addstream", function(e){
				e.from = data.from;
				self.trigger('streamCreated', e);
			}, false);

			// Add local stream
			// run now it localSteam exists
			self.one(!!localStream || 'mediaAdded', function(){
				pc.addStream(localStream);
			});

			// Create Offer
			if(RTCPeer){
				pc.createOffer(function(sessionDescr){
					pc.setLocalDescription(sessionDescr);
					self.send(sessionDescription);
				}, null, {'has_audio':true, 'has_video':true});
			}else{
				var offer = pc.createOffer({'has_audio':true, 'has_video':true});
				pc.setLocalDescription(pc.SDP_OFFER, offer);

				// DISPATCH OFFER
				self.send({
					type : 'processOffer',
					to : data.from,
					sdp : offer.toSdp()
				});

				pc.startIce();
			}

//			self.streams[data.to] = pc;
		});


		//
		// 4. processAnswer
		//
		// Once we sent back an answer we should
		this.on('processOffer', function(data){

			// Do we already have a PeerConnection for this user
			if(data.from in self.streams){
				// A peer connection for this user has already been created
				// This request is going to be ignored
				console.error("Offer already sent, only one party can do this");
				return;
			}
			

			var pc = self.streams[data.from] = PeerConnection(function(candidate){
				if(!candidate){
					return;
				}
				self.send({
					type: 'candidate',
					label: candidate.label||candidate.sdpMLineIndex, 
					candidate: candidate.toSdp ? candidate.toSdp() : candidate.candidate
				});
			});

			self.one(!!localStream || 'mediaAdded', function(){
				pc.addStream(localStream);
			});

			pc.addEventListener("addstream", function(e){
				e.from = data.from;
				self.trigger('streamCreated', e);
			}, false);


			if(RTCPeer){
				pc.setRemoteDescription(new RTCSessionDescription(data));

				pc.createAnswer(function(sessionDescr){
					pc.setLocalDescription(sessionDescr);
					self.send(sessionDescription);
				}, null, {'has_audio':true, 'has_video':true});
			}
			else{
				pc.setRemoteDescription(pc.SDP_OFFER, new SessionDescription(data.sdp));

				var offer = pc.remoteDescription;
				var answer = pc.createAnswer(offer.toSdp(), {'has_audio':true, 'has_video':true});

				pc.setLocalDescription(pc.SDP_ANSWER, answer);

				self.send({
					type : 'processAnswer',
					to : data.from,
					sdp : answer.toSdp()
				});

				pc.startIce();
			}


			// Assign it to be collected by other things
			self.streams[data.from] = pc;

		});


		//
		// 5. processAnswer
		//
		// Once we sent back an answer we should
		this.on('processAnswer', function(data){

			if(RTCPeer){
				self.streams[data.from].setRemoteDescription(new RTCSessionDescription(data));
			}
			else{
				self.streams[data.from].setRemoteDescription(self.streams[data.from].SDP_ANSWER, new SessionDescription(data.sdp));
			}
		});


		// not sure what ICE candidate is for
		this.on('candidate', function(data){
			if(RTCPeer){
				var candidate = new RTCIceCandidate({
					sdpMLineIndex:data.label,
					candidate:data.candidate
				});
				self.streams[data.from].addIceCandidate(candidate);
			}
			else{
				var candidate = new IceCandidate(data.label, data.candidate);
				self.streams[data.from].processIceMessage(candidate);
			}
		});





		return this;
	};

	// Does the browser support everything?
	TB.supported = navigator.getUserMedia && (window.webkitPeerConnection00 || window.webkitPeerConnection || window.webkitDeprecatedPeerConnection);

})(document, window);