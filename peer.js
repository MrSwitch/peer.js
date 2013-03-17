//
// PeerJS
// WebRTC Client Controler
// @author Andrew Dodson (@mr_switch)
// @since July
//
(function(document, window){

	// Switch between development and production
	var host, local = false;
	if(window.location.hostname.match(/^(local|192\.168\.)/)){
		local = true;
		host = window.location.hostname + ':5000';
		console.log("This is running on a local environment and automatically assumes you have http://github.com/MrSwitch/peer-server.js running on port 5000");
	}
	else{
		// Path to the PeerJS server
		host = "peer-server.herokuapp.com";
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
		};
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


	//
	// Build Peer Object
	//
	Peer = {};

	Peer.stun_server = "stun:stun.l.google.com:19302";

	Peer.dataChannelSupported = (function(){
		try{
			// raises exception if createDataChannel is not supported
			var pc = new PeerConnection(Peer.stun_server, {optional: {RtpDataChannels: true} });
			var channel = pc.createDataChannel('supportCheck', {reliable: false});
			channel.close();
			return true;
		} catch(e) {
			console.log(e);
			return false;
		}
	})();

	Peer.localMedia = function( rplElm ){

		if(!(this instanceof Peer.localMedia)){
			return new Peer.localMedia(rplElm);
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

			// Autoplay isn't working in FF, so set it here
			self.el.play();

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
				catch(_e){
					_failure();
				}
			}
			return this;
		};

		this.defaultEvents = function(){

			if(document.getCSSCanvasContext){
				var ctx = document.getCSSCanvasContext("2d", "videochat", 100, 38);
				ctx.lineWidth=1;
				ctx.fillStyle="#444444";
				ctx.lineStyle="#000000";
				ctx.font="18px sans-serif";
				ctx.fillText("start camera", 0, 16);
				ctx.fillText("[click]", 30, 35);
			}

			this.el.style.cssText = 'background-image: -webkit-canvas(videochat);'
				+'-webkit-transition: -webkit-transform 1s;'
				+'-webkit-transform-style: preserve-3d;'
				+'-webkit-transform: rotateY(0deg);'
				+'transition: transform 1s;'
				+'transform-style: preserve-3d;'
				+'transform: rotateY(0deg);'
				+'background-position: center center;'
				+'background-repeat: no-repeat no-repeat;';

			this.on('started', function(){
				self.el.style.backgroundImage = '-webkit-canvas(loading)';
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
		};

		return this;
	};


	(function(){
		if(document.getCSSCanvasContext){
			var ctx = document.getCSSCanvasContext("2d", "loading", 150, 20);
			ctx.lineWidth=1;
			ctx.fillStyle="#444444";
			ctx.lineStyle="#000000";
			ctx.font="18px sans-serif";
			ctx.fillText("Loading Video", 0, 20);
		}
	})();


	// initSession
	// Create a New Peer Session
	Peer.initSession = function(){
		var _group;

		// Lets force a new instance
		if(!(this instanceof Peer.initSession)){
			return new Peer.initSession();
		}

		// Apply on,trigger
		Events.apply(this, arguments);

		
		var socket;

		this.localStream = null;

		// We dont need to make these publicly avaliable
		// but what the heck, maybe its useful
		this.streams = {};

		var self = this;

		// Initiate SocketIO
		Queue.on(typeof(io)!=='undefined'||'loaded', function(){
			// Given a video tag
			// Broadcast to all parties the new stream
			self.socket = io.connect( ws );

			// Define an onload handler
			self.socket.on('message', function(data){
				console.info("Event:Received Message " + data);

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

				self.trigger(type, data, function(o){
					// if callback was defined, lets send it back
					if("callback" in data){
						o.to = data.from;
						o.callback_response = data.callback;
						self.socket.send(JSON.stringify(o));
					}
				});
			});
		});

		function emit(name,data){
			self.on(!!self.id||'init', function(){
				self.socket.emit(name, data);
			});
		}

		// Connect
		// This adds a user to a session, once in a session users can chat and share video with others in the same session.
		// Sends a "join" request and the name of the room to join to the server and will receive a "joined" response.
		// If the user was already in a session, or they want to leave the session by defining the session as `false` then..
		// The disconnect message is sent by the server
		this.connect = function(group){

			// Lets disconnect all peer connections we currently have
			if(_group&&_group!==group){

				// Tell everyone in the old group your leaving.
				self.send('disconnect',{
					group : _group
				});

				// Now trigger stream disconnects locally
				for(var x in self.streams){if(self.streams.hasOwnProperty(x)){
					this.trigger('disconnect', {from:x});
				}}
			}

			// Join group / leave group
			// This leaves the old group
			emit('join',group);

			_group = group;

			return this;
		};


		//
		// Add and watch personal identifications
		//
		this.me = function(data){
			console.log("me", data);
			if(!(data instanceof Array)){
				if(typeof(data)==='string'){
					data = [data];
				}
				else{
					console.error("Me data is neither an array or a string");
				}
			}
			emit('me', data );

			return this;
		};


		// Publish a new localMedia object
		this.addMedia = function(media){

			if((typeof(media)==='string')|| (media instanceof Element)){
				media = Peer.localMedia(media).defaultEvents().connect();
			}

			// Given a Media object, aka a video stream
			// Add it to the run or watch list
			media.one( !!media.stream || 'started', function(){
				self.localStream = media.stream;
				// Socket
				self.trigger('mediaAdded', media);
			});

			return this;
		};

		// Send message
		this.send = function(name, data, callback){

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

				// Add group
				if(_group&&!data[i].to){
					data[i].group = _group;
				}
			}

			// Add callback
			if(callback){
				this.callback.push(callback);
			}

			console.log("Sending: "+ name);
			console.log(data);

			this.on(!!this.id||'init', function(){
				self.socket.send(JSON.stringify(data));
			});

			return this;
		};


		// Peer Connection
		// This is the massive Nut that holds it together
		// But because its so ugly we are hiding it out of our code.
		// This creates instances of a new PeerConnection
		function PeerConnect(id,data){

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
				pc_config = {"iceServers": [{"url": Peer.stun_server}]};
//				stun = local ? null : Peer.stun_server;
			try{
				pc = new PeerConnection(pc_config);
				pc.onicecandidate = function(e){
					callback(e.candidate);
				};
			}catch(e){
				console.error("Failed to create PeerConnection, exception: " + e.message);
				return;
			}

			var vid = null;
			//pc.addEventListener("addstream", works in Chrome
			//pc.onaddstream works in FF and Chrome
			pc.onaddstream = function(e){
				e.from = id;
				e.url = window.URL.createObjectURL(e.stream);
				vid = document.createElement('video');
				vid.style.background = '-webkit-canvas(loading) no-repeat center center';
				vid.src= e.url;
				vid.autoplay = true;
				e.video = vid;
				self.trigger('media', e);
			};

			// pc.addEventListener("removestream", works in Chrome
			// pc.onremovestream works in Chrome and FF.
			pc.onremovestream = function(e){
				e.video = vid;
				self.trigger('mediaRemoved', e);
				if(vid&&vid.parentNode){
					vid.parentNode.removeChild(vid);
				}
			};

			// This doesn't work, would have to reevaluate
			self.on(!!self.localStream || 'mediaAdded', function(){
				if(pc.readyState==='closed'){
					console.log("PC:connection closed, can't add stream");
					return;
				}
				console.log("PC:adding local media");
				pc.addStream(self.localStream);
			});

			// Is this an offer or an answer?
			// No data is needed to make an offer
			var offer = !data;

			var config = null;//{'has_audio':true, 'has_video':true};

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



			return pc;
		}

		//
		// Invite
		// This function sends an offer request to a user at a given ID.
		this.offer = function(id){

			// If there is no local stream available then postpone this operation
			if(!self.localStream){
				this.one('mediaAdded', function(){
					self.offer(id);
				});
				return this;
			}

			// To decide which of the clients will make the offer (only one can at a time)
			// The session id is taken from the socket.io server
			if(id in self.streams){
				// A peer connection for this user has already been created
				// This request is going to be ignored
				console.error("this.offer(): This client has lost the toss, the other client must make the offer");
				return;
			}

			// Create a new PeerConnect
			self.streams[id] = PeerConnect(id);

			return this;
		};


		//
		// Accept
		//
		this.answer = function(data){

			if(!self.localStream){
				this.one('mediaAdded', function(){
					self.answer(data);
				});
				return this;
			}

			// Do we already have a PeerConnect for this user
			// We dont care, Who won the toss?
			if(data.from in self.streams){
				// A peer connection for this user has already been created
				// This request is going to be ignored
				console.error("this.answer(): This client has lost the toss, only one party can do this");
				return;
			}
			
			// Make a Peer Connection
			// And answer the offer
			self.streams[data.from] = PeerConnect(data.from,data);

			return this;
		};



		// EVENTS
		// The "default:" steps maybe cancelled using e.preventDefault()


		// Step A
		// When your client first establises a connection with the server we get an init Event
		this.on('init', function(data){
			// Assign local id
			self.id = data.from;
		});

		// Step A:default
		// After calling session.connect(), a "joined" event is returned.
		// Send the 'connect' event to everyone in the session.
		this.on('default:joined', function(data){
			// Tell everyone we're online
			self.send('connect');
		});

		// Step B
		// Send a response back saying. Hey nice to meet you, i am connected too.
		this.on('connect', function(data){

			// Obviously we dont want to resend this after the second response is a direct message
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
				self.one(!!self.localStream || 'mediaAdded', function(){
					self.offer(data.from);
				});
			}
		});

		// Step 2. Process invite
		// Send accept headers
		this.on('default:offer', function(data){

			// Received a connectionCreated event
			// Get their stream?
			self.one(!!self.localStream || 'mediaAdded', function(){
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

			console.log("on:answer: Answer recieved, connection created");
			self.streams[data.from].setRemoteDescription(new RTCSessionDescription(data.answer));
		});


		// not sure what ICE candidate is for
		this.on('candidate', function(data){

			if(!(data.from in self.streams)){
				console.log("Candidate needs initiation");
				return;
			}

			var candidate = new RTCIceCandidate({
				sdpMLineIndex:data.label,
				candidate:data.candidate
			});
			self.streams[data.from].addIceCandidate(candidate);
		});

		// When someone disconnects you get this fired
		this.on('disconnect', function(data){
			if((data.from in self.streams) && ("close" in self.streams[data.from])){
				
				// create the event
				if(self.streams[data.from].dispatchEvent){
					var evt = document.createEvent('Event');

					// define that the event name is `build`
					evt.initEvent('removestream', true, true);
					self.streams[data.from].dispatchEvent(evt);
				}
				else if(self.streams[data.from].onremovestream){
					//self.streams[data.from].onremovestream();
				}

				// Cancel the peer connection stream
				session.streams[data.from].close();

				// Remove the stream
				delete session.streams[data.from];

				//self.streams[data.from].close();
			}
		});


		window.onbeforeunload = function(){
			// Tell everyone else of the session close.
			if(self.socket){
				self.socket.disconnect();
			}
		};


		return this;
	};

	// Does the browser support everything?
	Peer.supported = !!(navigator.getUserMedia && PeerConnection);


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
			this.on(name, function once(){ self.off(name,once); callback.apply(this, arguments);} );
		};

		// Trigger Events defined on the publisher widget
		this.trigger = function(name,evt,callback){
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
							o(evt,callback);
						}
					});
				}
				
				// Defaults
				if(!preventDefault && "default:"+name in this.events){
					console.log('Triggered: default:' + name);
					this.events["default:"+name].forEach(function(o,i){
						if(o){
							o(evt,callback);
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