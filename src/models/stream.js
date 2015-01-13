//
// Stream
// Create a new PeerConnection
//


define([
	'../utils/PeerConnection',
	'../utils/RTCSessionDescription',

	'../utils/extend',
	'../utils/merge',
	'../utils/isEqual',
	'../utils/events'

], function(

	PeerConnection,
	RTCSessionDescription,

	extend,
	merge,
	isEqual,
	Events

){

	// Default Constraints
	var default_constraints = {
		video : false
	};


	var config = { 'optional': [], 'mandatory': {
					'OfferToReceiveAudio': true,
					'OfferToReceiveVideo': true }};

	var media;



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

				// Update an existing stream with fresh constraints
				if(constraints){
					stream.setConstraints( constraints );
				}

				// Output pupblished events from this stream
				stream.on('*', this.emit.bind(this) );

				// Control
				// This should now work, will have to reevaluate
				this.on('localmedia:connect', stream.addStream);
				this.on('localmedia:disconnect', stream.removeStream);

				//
				// Add the current Stream
				if(this.localmedia){
					stream.addStream(this.localmedia);
				}

				// intiiate the PeerConnection controller
				// Add the offer to the stream
				stream.open(offer || null);

				return stream;
			}

			else if(constraints){

				// Update an existing stream with fresh constraints
				stream.setConstraints( constraints );
			}
			else if(offer!==undefined){
				stream.open( offer );
			}

			return stream;
		};





		//////////////////////////////////////////////////
		// CHANNEL MESSAGING
		//////////////////////////////////////////////////

		// Store the socket send function
		var socketSend = this.send;

		// Change it
		this.send = function(name, data, callback){

			if(typeof name === 'object'){
				callback = data;
				data = name;
				name = data.type;
			}

			var recipient = data.to,
				stream = this.streams[recipient];

			if( recipient && stream && stream.channel && stream.channel.readyState==="open"){
				if(name){
					data.type = name;
				}
				var str = JSON.stringify(data);
				try{
					stream.channel.send(str);
					return;
				}
				catch(e){

					// Other party could have disappeared
					// code: 19
					// message: "Failed to execute 'send' on 'RTCDataChannel': Could not send data"
					// name: "NetworkError"

					stream.channel = null;

					// Retrigger the stream channel creation

					this.stream( recipient, null, null );

				}
			}

			// Else fallback to the socket method
			socketSend.call(this, name, data, callback);
		};




		//////////////////////////////////////////////////
		// STREAMS
		//////////////////////////////////////////////////


		// stream:connect
		// pass through any stream connection events

		this.on('stream:connect, stream:change, stream:constraints', function( e ){

			// What has changed
			var constraints = {};

			// we have information on what the remote constraints are
			if( e.remote ){
				constraints.remote = merge( default_constraints, e.remote );
			}
			// We have the local constraints
			// Let also check that this has no-from field
			if( e.local && !e.from ){
				constraints.local = merge( default_constraints, e.local );
			}

			// Create/Update the stream with the constraints offered.
			this.stream( e.from || e.id, constraints );

		});




		// stream:offer
		// A client has sent a Peer Connection Offer
		// An Offer Object:
		//  -  string: SDP packet, 
		//  -  string array: contraints

		this.on('stream:offer, stream:makeoffer', function(e){

			// Creates a stream:answer event
			this.stream( e.from, null, e.data || null );

		});



		//
		// stream:answer
		// 
		this.on('stream:answer', function(e){

			console.log("on:answer: Answer recieved, connection created");
			this.streams[e.from].pc.setRemoteDescription( new RTCSessionDescription( e.data ) );

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

			try{
				stream.pc.addIceCandidate(candidate);
			}
			catch(err){
				console.error('Failed to set iceCandidate');
				console.error( candidate );
				console.error( err );
			}
		});


		// Listen to change to the local media, and remove it streams if this occurs

		this.on('localmedia:disconnect', function(mediastream){
			// Loop through streams and call removeStream
			for(var x in this.streams){
				this.streams[x].pc.removeStream(mediastream);
			}
		});


		// Channels
		this.on('channel:connect', function(e){
			//
			// Process 
			// console.log('channel:connect',e);
		});

		// 
		this.on('channel:message', function(data){

			if("callback_response" in data){
				var i = data.callback_response;
				delete data.callback_response;
				this.callback[i].call(peer, data);
				return;
			}

			var type = data.type;

			this.emit(type, data, function(o){
				// if callback was defined, lets send it back
				if("callback" in data){
					o.to = data.from;
					o.callback_response = data.callback;
					this.send(o);
				}
			});
		});

	};




	// ////////////////////////////////////////////////////////////
	//
	//
	// Individual stream controller
	//
	//
	// ////////////////////////////////////////////////////////////











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


		// Default constraints
		stream.constraints = {
			remote : {},
			local : {}
		};


		// listen to stream change events
		stream.setConstraints = function(constraints){

			// If changes to the local constraint has occured
			// deliver these to the other peer
			var changed;
			if( constraints.local && !isEqual( stream.constraints.local, constraints.local ) ){
				changed = true;
			}
			
			// Update constraints
			extend(stream.constraints, constraints||{});

			console.log( stream.constraints );

			// Trigger Constraints/Media changed listener
			toggleLocalStream();

			// Has the local constraints changed?
			if(	changed ){
				// Tell the thirdparty about it
				peer.send({
					type: 'stream:constraints',
					remote : stream.constraints.local,
					to : id
				});
			}
		};


		// Listen out for stream:disconnected
		// this is triggered by the ICE candidate state change
		// It can be used to infer that the connection has dissappeared
		// We can use it to disable a media stream
		stream.on('stream:disconnected', function(){

			// Has a remotemedia value been proffered
			if( stream.remotemedia ){

				// Mimic the removal of the media
				stream.emit('media:disconnect', stream.remotemedia);

				// Reinstate it if the connection is reestablished
				stream.one('stream:connected', function(){
					stream.emit('media:connect', stream.remotemedia);
				});
			}

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
			console.warn("ICE-CONNECTION-STATE-CHANGE " + pc.iceConnectionState);

			// Determine whether the third party has ended their connection
			stream.emit('stream:'+pc.iceConnectionState, {
				from : id
			});
		};


		//pc.addEventListener("addstream", works in Chrome
		//pc.onaddstream works in FF and Chrome
		pc.onaddstream = function(e){
			e.from = id;
			stream.emit('media:connect', e);

			stream.remotemedia = e;


			// Listen to ended event
		/*	e.stream.addEventListener('ended', function(){
				alert('ended');
			});*/


			// Check to see if they are accepting video
			toggleLocalStream();
		};

		// pc.addEventListener("removestream", works in Chrome
		// pc.onremovestream works in Chrome and FF.
		pc.onremovestream = function(e){

			remotemedia = null;
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

			// Has the signalling state changed?

			if( pc.signalingState === 'closed' ){
				console.warn('signallingState closed');
				return;
			}

			if(MASTER){

				// Create an offer
				pc.createOffer(function(session){
					operation(function(){
						pc.setLocalDescription(session, function(){
							peer.send({
								type : "stream:offer",
								to : id,
								data : pc.localDescription
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

				// Trigger onnegotiation needed
				if( MASTER && !stream.channel ){
					// Create a datachannel
					// This initiates the onnegotiationneeded event
					stream.channel = pc.createDataChannel('data');
					setupDataChannel(stream.channel);
				}
				else{
					// trigger the fallback for on negotiation needed
					operation(pc.onnegotiationneeded);
				}

			}
			// No, we're processing an offer to make an answer then
			// If this client has protected itself then the third party clients offer is disgarded
			else{ // if(!PROTECTED){

				// Set the remote offer information
				pc.setRemoteDescription(new RTCSessionDescription(offer), function(){

					if( pc.signalingState === 'closed' ){
						console.warn("signalingState closed: during setRemoteDescription");
						return;
					}

					pc.createAnswer(function(session){
						console.log("pc.signalingState",pc.signalingState);

						if(pc.signalingState === 'closed'){
							console.warn("signalingState closed: after createAnswer");
							return;
						}

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

			console.debug("DATACHANNEL CREATED", channel);

			// Broadcast
			channel.onopen = function(e){
				stream.emit("channel:connect", {
					type : 'channel:connect',
					id : id,
					from : id,
					to : peer.id,
					target : e
				});
			};
			channel.onmessage = function(e){

				var data = JSON.parse(e.data);
				data.from = id;
				data.to = peer.id;
				data.target = e;

				stream.emit("channel:message", data);
			};
			channel.onerror = function(e){
				e.id = id;
				stream.emit("channel:error", e);
			};
		}

		function toggleLocalStream(){

			if(!pc || pc.readyState==='closed'){
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


});