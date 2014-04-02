//
// Stream
// Create a new PeerConnection
//
define([
	'utils/PeerConnection',
	'utils/RTCSessionDescription',

	'utils/events',

	'../bower_components/watch/src/watch'


], function(PeerConnection, RTCSessionDescription, Events, Watch){

	var watch = Watch.watch;

	var config = { 'optional': [], 'mandatory': {
					'OfferToReceiveAudio': true,
					'OfferToReceiveVideo': true }};

	var media;


	return function( id, constraints, STUN_SERVER, handler ){

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
			stream = Object.create(null);

		// Add default constraints
		stream.constraints = constraints || {};

		// Null
		stream.channel = null;

		// Extend the stream with events
		Events.call(stream);

		// Listen for changes in the constraints
		watch( stream.constraints, ['video','data'], toggleLocalStream );

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
					handler({
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
			return stream;
		}


		pc.onsignalingstatechange = function(e){
			operation();
		};


		//pc.addEventListener("addstream", works in Chrome
		//pc.onaddstream works in FF and Chrome
		pc.onaddstream = function(e){
			e.from = id;
			stream.emit('media:connect', e);
		};

		// pc.addEventListener("removestream", works in Chrome
		// pc.onremovestream works in Chrome and FF.
		pc.onremovestream = function(e){
			e.from = id;
			stream.emit('media:disconnect', e);
		};

		pc.ondatachannel = function(e){
			stream.channel = e.channel;
			setupDataChannel(e.channel);
		};

		pc.onnegotiationneeded = function(e){
			pc.createOffer(function(session){
				pc.setLocalDescription(session, function(){
					handler({
						type : "stream:offer",
						to : id,
						data : {
							offer : pc.localDescription
						}
					});
				}, errorHandler);

			}, null, config);
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
			else{

				// Set the remote offer information
				pc.setRemoteDescription(new RTCSessionDescription(offer), function(){
					pc.createAnswer(function(session){
						pc.setLocalDescription(session, function(){
							handler({
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
			console.log("SET Description fail triggered:",e);
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
	};
});