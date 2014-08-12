//
// Peer.js
// This is the business end
// Its responsible for maintaining user state and handling operations to connect two clients together
//

/*
	var peer = new Peer(socket.id);

	// listen to outgoing messages from the thread
	peer.onmessage = function(to, data){

		// Send
		console.log("SENDTO: "+ to +" "+ JSON.stringify(data) );
		to = to || socket.id;

		io.sockets.socket(to).send(JSON.stringify(data));

		// Store recipient
		// Save this recipient in the list of recipients
		add_index(recipients, data.from, to);
	};

	socket.on('thread:connect', function(data){
		data.type = 'thread:connect';
		peer.send(data);
	});

	socket.on('thread:disconnect', function(data){
		data.type = 'thread:disconnect';
		peer.send(data);
	});
	socket.on('session:tag',function(data){
		data.type = 'session:tag';
		peer.send(data);
	});
	socket.on('session:watch',function(data){
		data.type = 'session:watch';
		peer.send(data);
	});
	socket.on('socket:diconnect',function(data){
		data.type = 'socket:diconnect';
		peer.send(data);
	});
 */

module.exports = Peer;


//
// tag_sessions:
// Hash of User Tags	=> Array of Session ID's they belong too
var tag_sessions	= {},

// session_tags
// Hash of all SessionID => Tags

	session_tags = {},

//
// tag_messages:
// List of messages for a user once they come online and identify themselves by the tag
// hash[Tag] = [Message,...]

	tag_messages	= {},

// a list of session_tag_messages, hash[SocketId] = [Tags,...]  enabled us to clear up contacts by reference

	session_tag_messages	= {},


//
// Recipients
// Hash of Session ID's	=> Array of Session ID's the user has contacted within their session
// User to message with a disconnected status.
	recipients	= {},

//
// Friends sessions:
// Hash of Contact ID's	=> Array of session ID's to pass on to the contacts when they identify themselves
	friend_sessions		= {},

//
// Session Friends
// Hash of sessions ids => Array of Contacts ID's
	session_friends		= {},

//
// Sessions:
// Hash of Session ID's	=> Array of User ID's associated with the session
	session_userids		= {};



	// A list of all connections
var peers = {},

	// A list of all threads, aka shared rooms
	threads = {};


function Thread(thread_id){
				
	var thread = threads[thread_id];

	// Store this users association with the thread
	// Add this user to the threads connection
	if( !(thread_id in threads) ){

		// Create a new thread
		thread = threads[thread_id] = [];

		// Not sure we should do this
		thread.id = thread_id;

	}

	return thread;
}


//
// Creates a new thread instance
//

function Peer(id){

	if( id in peers && peers[id] ){
		return peers[id];
	}

	// Add this to the global list of peers;
	peers[id] = this;


	// Use the socket id
	this.id = id;


	// An array of ids which identify the user, such as their email, network ID's etc..
	this.tags = [];


	// A watch list which they are listening on
	this.watch = [];


	// collection of threads this peer is connected too.
	this.threads = [];


	// recipients
	// Collection of Session ID's which this user has contacted
	this.recipients = [];

}


// Constructor data

// Peers...
Peer.peers = peers;

// Threads...
Peer.threads = threads;

// Peer.messages a collection of messages which are targeted to a particular tag
Peer.messages = tag_messages;


// This will be called when there is a message to forward

Peer.prototype.onmessage = function(){};


// Receive incoming messages

Peer.prototype.send = function(data){

	if(typeof(data)==='string'){
		data = JSON.parse(data);
	}

	var type = data.type;

	switch(type){

		// THREAD:CONNECT
		// User is trying to connect with a thread

		case "thread:connect":

			// Get or Create a thread;
			this.addThread( data.thread, data);

		break;

		// Thread:disconnect
		// Remove a user from a thread

		case "thread:disconnect":

			// Untread
			this.removeThread( data.thread, data );

		break;


		// Add personal identifying data,
		// Typically this is either an email address or an ID, such as ....
		// `facebook_id`@facebook
		// `windows_id`@windows
		// `google_id`@google
		
		case 'session:tag':

			addTags.call( this, data );

		break;


		case 'socket:disconnect':

			this.close();

		break;

		default:

			message.call(this, data);
	}
};


// Close this connection

Peer.prototype.broadcast = function(thread, data){

	var self = this;

	// Get thread object
	thread = Thread(thread);

	data.from = this.id;
	data.thread = thread.id;

	// Loop through everyone on the thread and message them
	thread.forEach(function( peer_id ){
		if( peer_id !== self.id ){
			self.message( data, peer_id );
		}
	});
};


// Send a message to another peer

Peer.prototype.message = function(data, rcpt_id){

	data.from = this.id;
//	delete data.to;


	// Store this recipient communication

	if( this.recipients.indexOf( rcpt_id ) === -1 ){

		this.recipients.push(rcpt_id);

	}


	if( rcpt_id in peers && peers[ rcpt_id ] ){

		peers[ rcpt_id ].onmessage( data );

	}
};


// Close this connection

Peer.prototype.close = function(){
	
	// notify all listeners
	var peer = this,
		id = this.id;

	// Session tags is a list of all the tags identified by this session
	// On the flip side, tag_sessions lists all the sessions for a given tag.
	// We'll need to remove both of these

	if( this.tags.length ){

		// Find all the tags for the current session
		this.tags.forEach(function(tag){

			// The tag, remove the session
			unstore.call(tag_sessions, tag, id);

		});
	}


	// Remove watch tags, tags which a user is looking out for

	if( id in session_friends ){

		session_friends[id].forEach(function(friend_id){
			unstore.call( friend_sessions, friend_id, id );
		});

		delete session_friends[id];
	}


	// Loop through contacts

	if( id in session_tag_messages ){

		session_tag_messages[id].forEach(function(ref){

			// Remove the watch in the contacts list
			if( tag_messages[ref] ){
				tag_messages[ref].forEach(function(data,i){
					if(data&&data.from===id){
						tag_messages[ref][i] = null;
					}
				});
				// if there is none left, cleanup
				if( tag_messages[ref].filter(function(a){return !!a;}).length === 0 ){
					delete tag_messages[ref];
				}
			}
		});
	}


	// Broadcast disconnect to thread

	this.threads.forEach(function( thread ){

		// Tell everyone else in the thread

		peer.removeThread( thread.id, {
			type : 'thread:disconnect'
		});

	});

	// Remove list of threads
	this.threads = [];


	// Broadcast disconnect to anyone you've sent a message too.

	this.recipients.forEach(function(peer_id){

		peer.message( {
			type : 'socket:disconnect'
		}, peer_id );

	});

	this.recipients = [];


	// Remove from peer list
	peers[this.id] = null;

	delete this.onmessage;
};





// ////////////////////////////
// Threads
// Add thread

Peer.prototype.addThread = function(thread_id, data){

	var id = this.id;

	// Get the thread
	var thread = Thread(thread_id);

	// Add this peer to the thread array
	if( thread.indexOf(id) === -1 ){
		thread.push(id);
		this.threads.push(thread);
	}

	if(!data.to){
		// Broadcast your thread:connect event to everyone in the thread
		this.broadcast( thread_id, data );
	}
	else{
		// Send it to a particular user
		this.message( data, data.to );
	}
};



Peer.prototype.removeThread = function(thread_id, data){

	// Get the thread
	var thread = Thread(thread_id);

	// remove peer from thread
	var index = thread.indexOf(this.id);

	if(index>-1){
		thread.splice(index,1);
	}

	// Broadcast thread:disconnect event to everyone in the thread
	this.broadcast( thread_id, data );
};

//////////////////////////////////
// Add tags



// Add personal identifying data,
// Typically this is either an email address or an ID, such as ....
// `facebook_id`@facebook
// `windows_id`@windows
// `google_id`@google

function addTags(data){

	var peer = this;

	// The session has has a thirdparty ID
	// Loop through this Array
	// Add this profile reference to the global store
	// Loop though all tag_messages messages and send them to this session
	// Post back to this user all the session data in the friend list who want to know when this user is online
	(data.tag instanceof Array ? data.tag : [data.tag]).forEach(function(tag){


		// Add this tag to the current strand

		peer.tags.push( tag );


		// ADD to profiles
		// Has this UserID already been assoicated with this session?

		store.call( tag_sessions, tag, peer.id );


		// Return all tag_messages messages back to this user

		if( tag in tag_messages ){

			// Loop through and deliver tag_messages messages

			tag_messages[tag].forEach(function(data){

				// Send to self
				peer.onmessage(data);

			});

		}
	});
}






function message(_data){

	var socket = this,
		id = this.id;

	if(!(_data instanceof Array)){
		_data = [_data];
	}

	_data.forEach(function(data){

		data.from = id;

		if( !data.to && data.thread ){

			socket.broadcast( data.thread, data );
			return;
		}


		// How do we handle this message?
		// Does the message contain a 'to' field?
		( (data.to instanceof Array) ? data.to : [data.to] ).forEach( function( tag ){

			var _data = data;

			// No ID?
			if(!tag){
				return;
			}


			// Is this a Socket address given?
			// Aka not a tag

			if( tag in peers ){
				// Found a user based upon their session id.
				socket.message( _data, tag );
				return;
			}


			// Show Original ID ref
			_data.original_to = tag;

			// Look up the field
			if(tag in tag_sessions){
				// For each socket by that name send them the message
				tag_sessions[tag].forEach(function(id){
					socket.message( _data, id );
				});
			}
			// User is not online
			else {
				// Send them a message
				// Store the message that we're sending to this user until they come online.
				store.call(tag_messages, tag, _data);

				// Save the reference of the user, to their contact list, so we can clean up any tag_messages requests
				store.call(session_tag_messages, id, tag);
			}
		});
	});
}



//////////////////////////////////
// Global objects
//////////////////////////////////

function store(key, entry){

	if(!(key in this)){
		this[key] = [entry];
	}
	else if(this[key].indexOf(entry)===-1){
		// Associate the session ID's with the User ID
		this[key].push(entry);
	}
}


function unstore(key, entry){

	// If this was the last socket to define this then
	if(key in this){

		var i = this[key].indexOf(entry);

		if(i>-1){
			// remove from global tag_sessions hash
			this[key].splice(this[key].indexOf(entry),1);
		}

		// Is the hash now empty
		if(this[key].length===0){
			// remove from the profile list
			delete this[key];
		}
	}
}
