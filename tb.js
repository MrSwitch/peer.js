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
		console.log("This is running on a local environment and automatically assumes you have http://github.com/MrSwitch/messaging.io running on port 5000");
	}
	else{
		// Path to the Heroku messaging.io
		host = "deep-planet-5370.herokuapp.com";
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
							o(evt);
						}
					});
				}
				
				// Defaults
				if(!preventDefault && "default:"+name in this.events){
					console.log('Triggered: default:' + name);
					this.events["default:"+name].forEach(function(o,i){
						if(o){
							o(evt);
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
						this.events[name][i] === null;
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
				self.trigger('success', stream);
			};

			// Vid onload doesn't seem to fire
			self.trigger('started',stream);
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

		this.defaultEvents = function(){

			var ctx = document.getCSSCanvasContext("2d", "videochat", 150, 20);

			ctx.lineWidth=1;
			ctx.fillStyle="#444444";
			ctx.lineStyle="#000000";
			ctx.font="18px sans-serif";
			ctx.fillText("Click to video chat", 0, 20);

			this.el.style.background = '-webkit-canvas(videochat) no-repeat center center';
	
			this.el.style.setProperty('-webkit-transition',"-webkit-transform 1s");
			this.el.style.transition = "transform 1s";

			this.el.style.setProperty('-webkit-transform-style',"preserve-3d");
			this.el.style.setProperty('transform-style',"preserve-3d");

			this.el.style.setProperty('-webkit-transform',"rotateY(0deg)");
			this.el.style.transform = "rotateY(0deg)";					

			this.on('started', function(){
				self.el.style.background = '-webkit-canvas(loading) no-repeat center center';
				self.el.style.setProperty('-webkit-transform',"rotateY(180deg)");
				self.el.style.transform = "rotateY(180deg)";
				setTimeout(function(){
					self.el.style.removeProperty('background');
				},3e3);
			});

			this.el.addEventListener('click', function(e){
				if(!self.stream){
					self.connect();		
				}
			});

			return this;
		}

		return this;
	};


	(function(){
		try{
			var ctx = document.getCSSCanvasContext("2d", "loading", 150, 20);
			ctx.lineWidth=1;
			ctx.fillStyle="#444444";
			ctx.lineStyle="#000000";
			ctx.font="18px sans-serif";
			ctx.fillText("Loading Video", 0, 20);
		}catch(e){};
	})();


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
				self.socket = io.connect( ws );
				self.socket.emit('register', sessionId );

				// Define an onload handler
				self.socket.on('message', function(data){
					console.info("ws// Received Message " + data);

					data = JSON.parse(data);
					var type = data.type;
					try{
						delete data.type;
					}catch(e){}

					self.trigger(type,data);
				});
			});

			return this;
		};

		// Publish a new LocalMedia object
		this.addMedia = function(media){

			if((typeof(media)==='string')|| (media instanceof Element)){
				media = TB.LocalMedia(media).defaultEvents().connect();
			}

			// Given a Media object, aka a video stream
			// Add it to the run or watch list
			media.one( !!media.stream || 'started', function(){
				localStream = media.stream;
				// Socket
				self.trigger('mediaAdded', media);
			});

			return this;
		};

		// Send message
		this.send = function(name, data){
			data = data || {};
			data.type = name;
			console.log("Sending: "+ data.type);
			self.socket.send(JSON.stringify(data));
			return this;
		};


		// Peer Connection
		// This is the massive Nut that holds it together
		// But because its so ugly we are hiding it out of our code.
		// This creates instances of a new PeerConnection
		function PeerConnection(id,data){

			// Callback
			var callback = function(candidate){
				if(!candidate){
					return;
				}
				self.send('candidate',{
					label: candidate.label||candidate.sdpMLineIndex, 
					candidate: candidate.toSdp ? candidate.toSdp() : candidate.candidate,
					to : id
				});
			};

			// Peer Connection
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
					RTCPeer = false;
					pc = new webkitPeerConnection00(stun, callback);
				} catch (e) {
					console.error("Failed to create PeerConnection, exception: " + e.message);
					return;
				}
			}

			var vid = null;
			pc.addEventListener("addstream", function(e){
				e.from = id;
				e.url = window.URL.createObjectURL(e.stream);
				vid = document.createElement('video');
				vid.style.background = '-webkit-canvas(loading) no-repeat center center';
				vid.src= e.url;
				vid.autoplay = true;
				e.video = vid;
				self.trigger('media', e);
			}, false);


			pc.addEventListener("removestream", function(e){
				e.video = vid;
				self.trigger('mediaRemoved', e);
				if(vid&&vid.parentNode){
					vid.parentNode.removeChild(vid);
				}
			});

			self.on(!!localStream || 'mediaAdded', function(){
				console.log("adding media");
				pc.addStream(localStream);
			});

			// Is this an offer or an answer?
			// No data is needed to make an offer
			var offer = !data;

			var config = {'has_audio':true, 'has_video':true};

			// RTC Approach
			if(RTCPeer){

				// Making an offer?
				if(offer){
					pc.createOffer(function(session){
						pc.setLocalDescription(session);
						self.send("offer", {offer:session,to:id});
					}, null, config);
				}
				// No, we're processing an offer to make an answer then
				else{
					// Set the remote offer information
					pc.setRemoteDescription(new RTCSessionDescription(data.offer));
					pc.createAnswer(function(session){
						pc.setLocalDescription(session);
						self.send("answer", {answer:session,to:id});
					}, null, config);
				}
			}

			// Deprecated approach for Chrome 22
			else{

				if(offer){
					var offer = pc.createOffer(config);
					pc.setLocalDescription(pc.SDP_OFFER, offer);
					// DISPATCH OFFER
					self.send('offer',{
						to : id,
						sdp : offer.toSdp()
					});
					pc.startIce();
				}
				else{

					pc.setRemoteDescription(pc.SDP_OFFER, new SessionDescription(data.sdp));
					var answer = pc.createAnswer(pc.remoteDescription.toSdp(), config);
					pc.setLocalDescription(pc.SDP_ANSWER, answer);

					self.send('answer',{
						to : data.from,
						sdp : answer.toSdp()
					});
				}

				pc.startIce();
			}

			return pc;
		}

		//
		// Invite
		this.offer = function(id){

			if(!localStream){
				this.one('mediaAdded', function(){
					self.offer(id);
				});
				return this;
			}

			// Do we already have a PeerConnection for this user
			if(id in self.streams){
				// A peer connection for this user has already been created
				// This request is going to be ignored
				console.error("Offer/Answer already sent, only one party can do this");
				return;
			}

			// Create a new PeerConnection
			self.streams[id] = PeerConnection(id);

			return this;
		};


		//
		// Accept
		//
		this.answer = function(data){

			if(!localStream){
				this.one('mediaAdded', function(){
					self.answer(data);
				});
				return this;
			}

			// Do we already have a PeerConnection for this user
			if(data.from in self.streams){
				// A peer connection for this user has already been created
				// This request is going to be ignored
				console.error("Offer already sent, only one party can do this");
				return;
			}
			
			// Make a Peer Connection
			// And answer the offer
			self.streams[data.from] = PeerConnection(data.from,data);

			return this;
		};



		// EVENTS

		// Step A
		// When your client first connects you recieve a sessionConnected Event
		this.on('init', function(data){
			// Assign local id
			self.id = data.from;
		});

		// Step A:default
		// The default steps maybe cancelled using e.preventDefault()
		this.on('default:init', function(data){
			// Tell everyone we're online
			self.send('connect');
		});

		// Step B
		// Respond back directly to each client with another connect message
		// When someone else connects we get a stream created event from them
		this.on('connect', function(data){

			// Obviously we dont want to process this if we sent it.
			if(!("to" in data)){
				// send one back so that everyone knows everyone else
				self.send('connect',{
					to : data.from
				});
			}
		});


		// Now we start sending the Peer Connection requests

		// Step 1
		// Send invitation out
		this.on('default:connect', function(data){
			// If the connect response has been returned 
			if("to" in data){
				// The default action is to invite them to a peer connection
				self.one(!!localStream || 'mediaAdded', function(){
					self.offer(data.from);
				});
			}
		});

		// Step 2. Process invite
		// Send accept headers
		this.on('default:offer', function(data){

			// Received a connectionCreated event
			// Get their stream?
			self.one(!!localStream || 'mediaAdded', function(){
				self.answer(data);
			});
		});



		//
		// 3. process answer
		// Once we sent back an answer we should
		this.on('answer', function(data){

			if(!(data.from in self.streams)){
				// this endpoint should have sent a invite...?
				console.error("Answer called but this peer connection doesn't exist");
				return;
			}

			if(RTCPeer){
				self.streams[data.from].setRemoteDescription(new RTCSessionDescription(data.answer));
			}
			else{
				self.streams[data.from].setRemoteDescription(self.streams[data.from].SDP_ANSWER, new SessionDescription(data.sdp));
			}
		});


		// not sure what ICE candidate is for
		this.on('candidate', function(data){

			if(!(data.from in self.streams)){
				console.log("Candidate needs initiation");
				return;
			}

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

		// When someone disconnects you get this fired
		this.on('disconnect', function(data){
			if((data.from in self.streams) && ("close" in self.streams[data.from])){
				// create the event
				var evt = document.createEvent('Event');
				// define that the event name is `build`
				evt.initEvent('removestream', true, true);
				self.streams[data.from].dispatchEvent(evt);
				//self.streams[data.from].close();
			}
		});


		window.onbeforeunload = function(){
			self.send('disconnect');
		};


		return this;
	};

	// Does the browser support everything?
	TB.supported = navigator.getUserMedia && (window.webkitPeerConnection00 || window.webkitPeerConnection || window.webkitDeprecatedPeerConnection);

})(document, window);