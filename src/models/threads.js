//
// Threads
// Maintain a list of threads which a user is subscribed too
//
define([
	'../utils/extend'
],
function(
	extend
){


	// A thread is a collection of the following

	function Thread(id){
		this.id = id;
		this.constraints = {};
		this.streams = {};
		this.state = 'connect';
	}


	// Extention of the peer object

	return function(){

		//
		// A collection of threads for which this user has connected
		this.threads = {};


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
		this.thread = function(id, constraints){

			var init = false;

			if( typeof(id) === "object" || !id ){
				if(!constraints){
					constraints = id || {};
				}

				// Make up a new thread ID if one wasn't given
				id = (Math.random() * 1e18).toString(36);
			}


			// Get the thread
			var thread = this.threads[id];


			// Type
			var type;


			// INIT
			// Else intiiatlize the thread
			if(!thread){

				// Create the thread object
				thread = this.threads[id] =  new Thread(id);
				thread.constraints = constraints || {};

				// Response
				type = "thread:connect";

			}

			// CHANGE constraints
			else if( constraints ){

				// If this had been deleted
				if(!thread.constraints){
					// reinstate it
					thread.constraints = {};
				}

				// Update thread constraints
				extend( thread.constraints, constraints );

				// Response
				type = "thread:change";

			}

			//
			// DISCONNECT
			else if( constraints === false ){

				// Update state
				thread.constraints = false;
				type = "thread:disconnect";
			}


			if( type ){

				var data = {
					thread : id,
				};

				// Constraints changed?
				if( constraints ){
					data.constraints = thread.constraints;
				}


				// Connect to a messaging group
				this.send(type, data);

				// Triggered locally
				this.emit(type, data);

			}


			return thread;
		};



		//
		// Thread:Connect (comms)
		// When a user B has joined a thread the party in that thread A is notified with a thread:connect Event
		// Party A replies with an identical thread:connect to party B (this ensures everyone connecting is actually online)
		// Party B does not reply to direct thread:connect containing a "to" field events, and the chain is broken.
		//
		this.on('thread:connect, thread:change', function(e){

			// The incoming user

			var remoteID = e.from;

			console.log("thread:change", JSON.stringify(e));


			// Must include a thread id.
			// If this was triggered locally, it wont include the e.from field

			if ( !e.thread ){
				// this is nonsense
				throw Error("thread:* event fired without a thread value");
			}

			// Get or create a thread
			// But it could be that the thread was somehow removed.

			var thread = this.thread(e.thread);


			if ( !remoteID ){

				// this is a local update
				// let all the streams in the thread know
				for( remoteID in thread.streams ){
					updatePeerConnection.call(this, remoteID);
				}

				// Lets not do anything.
				return;
			}


			// Establish/Update a session for the thread

			if( !(remoteID in thread.streams) ){

				// Set the default
				thread.streams[remoteID] = e.constraints || {};
			}
			else{
				// The stream object contains the constraints for that user
				// Lets apply the constraints from this connection too that user.
				extend( thread.streams[remoteID], e.constraints || {} );
			}


			// Trigger a review of this peer connection
			updatePeerConnection.call(this, remoteID);


			// SEND THREAD:CONNECT
			// Was this a direct message?
			if(!e.to){
				// Send a thread:connect back to the remote
				var data = {
					to : remoteID,
					thread : thread.id,
					constraints : thread.constraints
				};
				console.log("SEND", JSON.stringify(data));
				this.send('thread:connect', data);
			}
		});


		// thread:disconnect
		// When a member disconnects from a thread we get a thread:disconnect event

		this.on('thread:disconnect', function(e){

			// Get thread
			var thread = this.threads[e.thread];
			var remoteID;

			// Is from a remote peer
			if( "from" in e ){
				
				remoteID = e.from;

				// From a remote peer removing their thread connection
				if( remoteID in thread.streams ){

					delete thread.streams[remoteID];

					// Clean up sessions
					updatePeerConnection.call(this, remoteID);
				}
			}

			// From the local peer, removing themselves from a thread
			else{

				// Loop through the thread streams
				for( remoteID in threads.stream ){

					// Clean up peer connection
					updatePeerConnection.call(this, remoteID);
				}

			}

		});


		// For all the active peers pertaining to multiple threads, determine whether the connection setting have changed.
		// 
		// This is done my looping through all threads to find the session for a particular peer
		// Building a list of the maximum constraint connection requirements for that remote peer.
		// Whilst building a maximum constraints for the local peer for where the remote peer is in the same thread.
		// Trigger a stream:change event with the constraints from the aforementioned two maxiumm requirements

		function updatePeerConnection( remoteID ){

			// Placeholder to store the minimal requirement for this peer

			var local = {},
				remote = {};

			// Start looping through the threads
			// And then the streams

			for( var threadId in this.threads ){

				var thread = this.threads[threadId];
				var streams = thread.streams;

				// Is this peer not associated with the current thread
				if( !( remoteID in streams ) ){
					// Look at the next thread
					continue;
				}

				// REMOTE
				extendProperties( remote, streams[remoteID] );

				// LOCAL
				extendProperties( local, thread.constraints );

			}


			// Once all the stream credentials have been scooped up...
			// Emit a stream:change event
			this.emit('stream:change',{
				id : remoteID,
				local : local,
				remote : remote
			});
		}

	};


	function extendProperties(a,b){

		if(!b){
			return;
		}

		for( var constraint in b ){

			var value = b[constraint];

			// If the constraint is true
			if( value ){

				// Update a
				a[constraint] = value;
			}
		}
	}

});