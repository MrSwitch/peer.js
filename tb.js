//
//
// TB.Lite
//
//
(function(){

	// Does this browser support WebRTC?
	navigator.getUserMedia || (navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

	// URL?
	window.URL || (window.URL = window.webkitURL);


	// This is the massive Nut that holds it together
	// But because its so ugly we are hiding it out of our code.
	// This creates instances of a new PeerConnection
	function PeerConnection(callback){
		var peerConn;
		try {
			peerConn = new webkitDeprecatedPeerConnection("STUN stun.l.google.com:19302", callback);
		} catch (e) {
			try {
				peerConn = new webkitPeerConnection("STUN stun.l.google.com:19302", callback);
			} catch (e) {
				console.log("Failed to create PeerConnection, exception: " + e.message);
			}
		}
		return peerConn;
	}



	// EVENTS
	// Extend the function we do have.
	var Events = function(){

		this._listeners = {};

		// Return
		this.on = function(name, callback){

			if(typeof(name)==='object'){
				for(var x in name){
					this.on(x, name[x]);
				}
				return this;
			}
			console.log('ATTACHED: ' + name);

			if(callback){
				// Set the listeners if its undefined
			this._listeners[name] || (this._listeners[name] = []);

				// Append the new callback to the listeners
				this._listeners[name].push(callback);
			}

			return this;
		};

			// Trigger Events defined on the publisher widget
		this.trigger = function(name,evt){
				console.log('Triggered: ' + name);
				if(this._listeners[name]){
					this._listeners[name].forEach(function(o,i){
						o(evt);
					});
				}

				return this;
		};
	};


	TB = {};

	TB.initPublisher = function( rplElm ){

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

		// Define local vid reference
		var vid;

		// Is the item in a video element?
		if(rplElm.tagName.toLowerCase() !== 'video'){
			vid = document.createElement('video');
			rplElm.appendChild(vid);
		}
		else{
			vid = rplElm;
		}

		// Set AutoPlay
		vid.autoplay = true;

		// Create a success callback
		// Fired when the users camera is attached
		var _success = function(stream){

			// Attach the stream to the UI
			vid.src = URL ? URL.createObjectURL(stream) : stream;

			// Save stream to element
			self.stream = stream;

			// Add an error event
			vid.onerror = function () {
				stream.stop();
				self.trigger('failure');
			};

			// Trigger any success listeners.
			vid.onload = function(){
				self.trigger('success');
			};

			// Vid onload doesn't seem to fire
			self.trigger('started');
		};

		// Trigger a failure
		var _failure = function(){
			console.log('failed');
			method.trigger('failure');
		};

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
	};


	// initSession
	// Create a New Peer Session
	TB.initSession = function(sessionId, apiKey, token){

		// Apply on,trigger
		Events.apply(this, arguments);

		
		var socket,
			peerConn = {},
			localStream;
		

		var self = this;

		// Add listeners for new messages
		this.connect = function(video){
			// Given a video tag
			// Broadcast to all parties the new stream
			socket = io.connect('ws://'+window.location.host );

			// Define an onload handler
			socket.on('message', function(data){
				console.info("WebSocket Message " + data);

				data = JSON.parse(data);

				self.trigger(data.type,data);
			});
		};

		// Publish a new LocalMedia object
		this.publish = function(camera){
			// Given a video tag
			// Lets pass in the SDP over
			var action = function(){
				localStream = camera.stream;
				// Socket
				self.send({
					type : 'streamAvailable'
				});
			};

			// LocalStream
			if(camera.stream){
				action();
			}
			else{
				camera.on('started', action);
			}
		};

		// Send message
		this.send = function(o){
			socket.send(JSON.stringify(o));
		};




		// Bind events



		// When your client first connects you recieve a sessionConnected Event
		this.on('sessionConnected', function(){

		});


		// When someone disconnects you get this fired
		this.on('connectionDestroyed', function(){

		});


		// When someone else connects you need to send them a streamCreated event
		this.on('connectionCreated', function(data){

			// If we have a localStream defined lets tell the end user that a stream is available
			if(localStream){
				self.send({
					type : 'streamAvailable',
					to : data.from
				});
			}
		});


		//
		// streamAvailable
		// When another client starts publishing they send a streamAvailable event.
		// This client then responds requesting an OFFER
		this.on('streamAvailable', function(data){

			// Received a connectionCreated event
			// Get their stream?
			self.send({
				type : 'requestOffer',
				to : data.from
			});
		});


		//
		// requestOffer
		// A client has sent a directMessage to connect to this client
		// We obtain an OFFER from the STUN server
		// And post it back to the other client
		this.on('requestOffer', function(data){

			if(!localStream){
				console.log('Something went wrong you dont have a local Media');
			}

			peerConn[data.from] = PeerConnection(function(message){

				// IF THIS IS CALLED IN STEP 3: Reponse to an ANSWER
				// THEN IT WONT CONTAIN AN OFFER
				if(message.indexOf('OFFER')===-1){
					console.error('NOT AN OFFER');
					return;
				}

				// DISPATCH OFFER
				self.send({
					type : 'processOffer',
					to : data.from,
					payload : message
				});
			});

			peerConn[data.from].addStream(localStream);

		});


		// processAnswer
		// Once we sent back an answer we should
		this.on('processOffer', function(data){


			peerConn[data.from] = PeerConnection(function(message){
				self.send({
					type : 'processAnswer',
					to : data.from,
					payload : message
				});
			});
			
			// PeerConn
			peerConn[data.from].addEventListener("addstream", function(event){
				self.trigger('streamCreated', event);
			}, false);

			peerConn[data.from].addEventListener("removestream", function(event){
				self.trigger('streamDestroyed', event);
			}, false);

			peerConn[data.from].processSignalingMessage(data.payload);

		});


		// processAnswer
		// Once we sent back an answer we should
		this.on('processAnswer', function(data){

			console.log("Signal");

			peerConn[data.from].addStream(localStream);
			peerConn[data.from].processSignalingMessage(data.payload);

		});


		return this;
	};


})();