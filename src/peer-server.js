//
// Peer Server
// Requires Socket.IO
//
var socket=require("socket.io");


module.exports = function(app){

	var io=socket.listen(app);
	io.enable('browser client minification');  // send minified client
	io.enable('browser client etag');          // apply etag caching logic based on version number
	io.enable('browser client gzip');          // gzip the file
	io.set('log level', 1);                    // reduce logging

	// This has to be run on port 80
	io.configure(function (){
		io.set("transports", ["xhr-polling"]);
		io.set("polling duration", 10);
	});


	//////////////////////////////////
	// Global objects
	//////////////////////////////////

	//
	// Profiles:
	// Hash of User ID's	=> Array of session ID's they belong too
	var profiles	= {},

	//
	// Pending:
	// Hash of Contact ID's	=> Array of messages pending for them once they come online
		pending		= {},

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



	//////////////////////////////////
	// Create a new Client
	//////////////////////////////////

	io.sockets.on('connection', function (socket) {

		var threads = [],
			my_contacts = [];


		function send(to, data){

			// Send
			to = to || socket.id;

			io.sockets.socket(to).send(JSON.stringify(data));

			// Store recipient
			// Save this recipient in the list of recipients
			add_index(recipients, data.from, to);
		}

		socket.send(JSON.stringify({
			type : 'socket:connect',
			from : socket.id,
			to : socket.id
		}));

		socket.on('*', function(data){
			console.log(arguments);
		});

		//
		// Assign user to a 'thread'
		// Listen for a 'join' event
		// We can join multiple threads simultaneously
		//
		socket.on('thread:connect', function(data){

			var thread = data.thread;

			// Join Group
			if(threads.indexOf( thread ) === -1){
				threads.push(data.thread);
				socket.join(data.thread);
			}

			// Add from address
			data.type = "thread:connect";
			data.from = socket.id;

			if(!data.to){
				// Broadcast your thread:connect event to everyone
				socket.broadcast.to(data.thread).send(JSON.stringify(data));
			}
			else{
				send(data.to, data);
			}
		});

		// Leave
		socket.on('thread:disconnect', function(thread){

			// remove from the list
			threads.splice(threads.indexOf(thread),1);

			// Leaving thread
			socket.leave(thread);

			console.log("leave: "+thread);
		});


		// Listen to events
		socket.on('message', function(_data){

			console.log('Message Recieved');
			console.log(_data);

			_data = JSON.parse(_data);

			if(!(_data instanceof Array)){
				_data = [_data];
			}

			_data.forEach(function(data){

				data.from = socket.id;

				// How do we handle this message?
				// Does the message contain a 'to' field?
				if(data.to){

					var to = data.to;
					delete data.to;

					if(!(to instanceof Array)){
						to = [to];
					}
					to.forEach(function(id){

						// No ID?
						if(!id){
							return;
						}

						// Clone the data
						// Ok this isn't really a clone
						var _data = data;

						// Is this a Socket address given?
						// Aka not an email address
						if(!id.match("@")){
							// Send data
							_data.to = id;
							send(id, _data);
							return;
						}


						// Now we're looking for a reference to the users SocketID.
						var ref = id;

						// Show Original ID ref
						_data.original_to = ref;

						// Look up the field
						if(ref in profiles){
							// For each socket by that name send them the message
							profiles[ref].forEach(function(id){
								_data.to = id;
								send(id, _data);
							});
						}
						// User is not online
						else {
							// Send them a message
							// Store the message that we're sending to this user until they come online.
							add_index(pending, ref, _data);

							// Save the id of the user, so we can clean it up if you leave before they come online.
							my_contacts.push(ref);
						}
					});
				}
				else if(data.thread){
					socket.broadcast.to(data.thread).send(JSON.stringify(data));
				}
			});
		});


		// Add personal identifying data,
		// Typically this is either an email address or an ID, such as ....
		// `facebook_id`@facebook
		// `windows_id`@windows
		// `google_id`@google
		socket.on('socket:tag',function(data){

			// The session has has a thirdparty ID
			// Loop through this Array
			// Add this profile reference to the global store
			// Loop though all pending messages and send them to this session
			// Post back to this user all the session data in the friend list who want to know when this user is online
			(data instanceof Array ? data : [data]).forEach(function(id){

				//
				// ADD to profiles
				// Has this UserID already been assoicated with this session?
				add_index(profiles, id, socket.id);

				//
				// ADD to sessions
				// Has this UserID already been assoicated with this session?
				add_index(session_userids, socket.id, id);

				//
				// Emit 'friend' event to this session all UserID's listening
				// Loop through friends
				if(id in friend_sessions){

					// Get all sessions who are listening
					friend_sessions[id].forEach(function(session_id){

						// Send to this current socket
						send(socket.id, {
							type : 'friend',
							data : session_userids[session_id],
							from : session_id
						});
					});
				}

				//
				// EMIT All pending messages
				// Is anyone listening for this user?
				if(id in pending){
					// Loop through and deliver pending messages
					pending[id].forEach(function(data){
						if(data){
							// Send to self
							send(socket.id, data);
						}
					});
					// Delete
					//delete pending[ref];
				}
			});
		});


		//
		// Watch array
		// Define Profile ID's of user's one wishes to watch
		// e.g. [`facebook_id`@facebook, `windows_id`@windows, `google_id`@google]
		//
		socket.on('socket:watch',function(data){

			// Loop through the ID's
			(data instanceof Array ? data : [data]).forEach(function(id){

				// Add this session to the list of sessions listening on this friend
				add_index(friend_sessions, id, socket.id);

				// Store the opposite
				add_index(session_friends, socket.id, id);


				//
				// Friend Online
				//
				if(id in profiles){

					//
					// Emit a friend event
					// Deliver to all friends session ID's a list of this sessions User ID's
					//
					profiles[id].forEach(function(session_id){

						// Deliver to the 'friend' this user... who wants to know their online status
						send(session_id,{
							type : "socket:watch",
							data : profiles[socket.id],
							from : socket.id
						});
					});
				}
			});
		});


		socket.on('socket:disconnect', function(){

			// Remove session from profiles
			if(socket.id in session_userids){
				session_userids[socket.id].forEach(function(user_id){
					remove_index(profiles, user_id, socket.id);
				});
				delete session_userids[socket.id];
			}

			// Remove sessions from contacts
			if(socket.id in session_friends){
				session_friends[socket.id].forEach(function(friend_id){
					remove_index(friend_sessions, friend_id, socket.id);
				});
				delete session_friends[socket.id];
			}

			// Loop through contacts
			my_contacts.forEach(function(ref){

				// Remove the watch in the contacts list
				if(pending[ref]){
					pending[ref].forEach(function(data,i){
						if(data&&data.from===socket.id){
							pending[ref][i] = null;
						}
					});
					// if there is none left, cleanup
					if( pending[ref].filter(function(a){return !!a;}).length === 0 ){
						delete pending[ref];
					}
				}
			});

			// Broadcast disconnect to thread
			threads.forEach(function( thread ){
				socket.broadcast.to( thread ).send(JSON.stringify({
					type : 'socket:disconnect',
					from : socket.id
				}));
			});

			// Broadcast disconnect to anyone you've sent a message too.
			if(socket.id in recipients){
				recipients[socket.id].forEach(function(id){
					send(id, {
						type : 'socket:disconnect',
						from : socket.id
					});
				});
				delete recipients[socket.id];
			}
		});
	});

};


//////////////////////////////////
// Global objects
//////////////////////////////////

function add_index(obj, key, entry){

	if(!(key in obj)){
		obj[key] = [entry];
	}
	else if(obj[key].indexOf(entry)===-1){
		// Associate the session ID's with the User ID
		obj[key].push(entry);
	}
}


function remove_index(obj, key, entry){

	// If this was the last socket to define this then
	if(key in obj){

		var i = obj[key].indexOf(entry);

		if(i>-1){
			// remove from global profiles hash
			obj[key].splice(obj[key].indexOf(entry),1);
		}

		// Is the profiles hash now empty
		if(obj[key].length===0){
			// remove from the profile list
			delete obj[key];
		}
	}
}