//
// Stream
// Create a new PeerConnection
//


define([
	'../utils/PeerConnection',
	'../utils/RTCSessionDescription',

	'../utils/events'

], function(

	PeerConnection,
	RTCSessionDescription,

	Events

){

	var config = { 'optional': [], 'mandatory': {
					'OfferToReceiveAudio': true,
					'OfferToReceiveVideo': true }};

	var media;


	function Stream( id, constraints, STUN_SERVER, peer ){

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


		var pc,
			stream = new Events();

		// Creating an offer is a little fraught with dnager if the other party does so too
		// To mitigate the problems lets turn on a flag when the master client (determined arbitarily from session ID)
		// Needs a negotiation that they wont process offers themselves
		var MASTER = id < peer.id;

		// Null
		stream.channel = null;

		// Add default constraints
		function setConstraints(constraints){
			stream.constraints = {
				remote : constraints.remote || {},
				local : constraints.local || {},
			};
		}

		setConstraints(constraints);

		// listen to stream change events
		stream.on('stream:constraints', function(constraints){
			setConstraints(constraints);
			toggleLocalStream();
		});


		// Peer Connection
		// Initiate a local peer connection handler
		var pc_config = {"iceServers": [{"url": STUN_SERVER}]},
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
					peer.send({
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
			console.error("PeerJS: Failed to create PeerConnection, exception: " + e.message);
			return stream;
		}


		pc.onsignalingstatechange = function(e){
			operation();
		};


		pc.oniceconnectionstatechange = function(e){
			console.warn("ICE-CONNECTION-STATE-CHANGE",e,pc.iceConnectionState);
		};


		//pc.addEventListener("addstream", works in Chrome
		//pc.onaddstream works in FF and Chrome
		pc.onaddstream = function(e){
			e.from = id;
			stream.emit('media:connect', e);

			// Check to see if they are accepting video
			toggleLocalStream();
		};

		// pc.addEventListener("removestream", works in Chrome
		// pc.onremovestream works in Chrome and FF.
		pc.onremovestream = function(e){
			e.from = id;
			stream.emit('media:disconnect', e);

			// Check to see if they are accepting video
			toggleLocalStream();
		};

		pc.ondatachannel = function(e){
			stream.channel = e.channel;
			setupDataChannel(e.channel);
		};

		pc.onnegotiationneeded = function(e){

			if(MASTER){

				// Create an offer
				pc.createOffer(function(session){
					operation(function(){
						pc.setLocalDescription(session, function(){
							peer.send({
								type : "stream:offer",
								to : id,
								data : {
									offer : pc.localDescription
								}
							});
						}, errorHandler);
					});
				}, null, config);

			}

			else{

				// Ask the other client to make the offer
				peer.send({
					type : "stream:makeoffer",
					to : id
				});

			}

		};


		stream.addStream = function(_media){
			media = _media;
			toggleLocalStream();
		};

		stream.removeStream = function(){
			media = null;
			toggleLocalStream();
		};


		stream.open = function(offer){

			// Is this an offer or an answer?
			// No data is needed to make an offer
			// Making an offer?
			if(!offer){

				// Create a datachannel
				// This initiates the onnegotiationneeded event
				stream.channel = pc.createDataChannel('data');
				setupDataChannel(stream.channel);
			}
			// No, we're processing an offer to make an answer then
			// If this client has protected itself then the third party clients offer is disgarded
			else{ // if(!PROTECTED){

				// Set the remote offer information
				pc.setRemoteDescription(new RTCSessionDescription(offer), function(){
					pc.createAnswer(function(session){
						console.log("pc.signalingState",pc.signalingState);
						pc.setLocalDescription(session, function(){
							peer.send({
								type : "stream:answer",
								to : id,
								data : pc.localDescription
							});
						},errorHandler);
					}, null, config);
				});
			}
		};


		return stream;

		function errorHandler(e){
			console.error("SET Description failed triggered:",e);
		}

		//
		function setupDataChannel(channel){

			// Broadcast
			channel.onopen = function(e){
				e.id = id;
				stream.emit("channel:connect", e);
			};
			channel.onmessage = function(e){
				e.id = id;
				stream.emit("channel:message", e);
			};
			channel.onerror = function(e){
				e.id = id;
				stream.emit("channel:error", e);
			};
		}

		function toggleLocalStream(){

			if(pc.readyState==='closed'){
				console.log("PC:connection closed, can't add stream");
				return;
			}


			// Do the constraints allow for media to be added?
			if(!stream.constraints.local.video||!stream.constraints.remote.video||!media){

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

			// Has the media already been added?
			var exit = false;
			pc.getLocalStreams().forEach(function(_media){
				if(media === _media){
					exit = true;
				}
			});
			if(exit){
				return;
			}

			// Set up listeners when tracks are removed from this stream
			// Aka if the streams loses its audio/video track we want this to update this peer connection stream
			// For some reason it doesn't... which is weird
			// TODO: remove the any tracks from the stream here if this is not a regular call.
			operation(function(){
				// We should probably remove the stream here
				console.log("Adding local stream");
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
	}


	// Extend our Global object with the stream methods, collections and listeners

	return function(){

		// A collection of Peer Connection streams

		this.streams = {};


		// Stream
		// Establishes a connection with a user

		this.stream = function( id, constraints, offer ){

			console.log("stream", arguments);

			if(!id){
				throw 'streams(): Expecting an ID';
			}
			
			// Does this stream exist?
			var stream = this.streams[id];

			if(!stream){

				// Create a new stream
				stream = this.streams[id] = Stream( id, constraints, this.stun_server, this );

				// Output pupblished events from this stream
				stream.on('*', this.emit.bind(self) );

				// Control
				// This should now work, will have to reevaluate
				this.on('localmedia:connect', stream.addStream);
				this.on('localmedia:disconnect', stream.removeStream);

				//
				// Add the current Stream
				if(this.localmedia){
					stream.addStream(this.localmedia);
				}
			}

			else if(constraints){

				// Update an existing stream with fresh constraints
				stream.emit('stream:constraints', constraints);
			}

			// intiiate the PeerConnection controller
			// Add the offer to the stream
			stream.open(offer || null);
		};


		//////////////////////////////////////////////////
		// STREAMS
		//////////////////////////////////////////////////


		// stream:connect
		// pass through any stream connection events

		this.on('stream:connect, stream:change', function( e ){


			// Create/Update the stream with the constraints offered.

			this.stream( e.from || e.id, {
				remote : e.remote,
				local : e.local
			});

		});




		// stream:offer
		// A client has sent a Peer Connection Offer
		// An Offer Object:
		//  -  string: SDP packet, 
		//  -  string array: contraints

		this.on('stream:offer, stream:makeoffer', function(e){

			// Creates a stream:answer event
			this.stream( e.from, null, e.data && e.data.offer );

		});



		//
		// stream:answer
		// 
		this.on('stream:answer', function(e){

			console.log("on:answer: Answer recieved, connection created");
			this.streams[e.from].pc.setRemoteDescription( new RTCSessionDescription(e.data) );

		});



		// 
		// Relay ice Candidates
		//

		this.on('stream:candidate', function(e){

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


		// Listen to change to the local media, and remove it streams if this occurs

		this.on('localmedia:disconnect', function(mediastream){
			// Loop through streams and call removeStream
			for(var x in this.streams){
				this.streams[x].pc.removeStream(mediastream);
			}
		});



	};

});