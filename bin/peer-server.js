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

	/**/
	// Global objects
	var profiles = {}, 
		pending = {},
		recipients = {};

	// Create a new Client
	io.sockets.on('connection', function (socket) {

		var _group,
			my_profiles = [],
			my_contacts = [];

		// Initiate the list of people we've contacted
		recipients[socket.id] = [];

		function send(to, data){
			// Send
			to = to || socket.id;

			io.sockets.socket(to).send(JSON.stringify(data));
			// Store recipient
			// Save this recipient in the list of recipients
			if(recipients[data.from].indexOf(to)===-1){
				recipients[data.from].push(to);
			}
		}


		socket.send(JSON.stringify({
			type : 'init',
			from : socket.id,
			to : socket.id
		}));

		// join
		socket.on('join', function(group){

			if(_group&&group!==_group){
				socket.leave(_group);
			}

			if(group){
				// Join Group
				console.log("Joined "+group);
				socket.join(group);

				// Broadcast to yourself that you have joined a room
				socket.send(JSON.stringify({
					type : 'joined',
					from : socket.id,
					to : socket.id
				}));
			}

			// Set Global
			_group = group;
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
							if(!(ref in pending)){
								pending[ref]=[];
							}

							pending[ref].push(_data);

							// Save the id of the user, so we can clean it up if you leave before they come online.
							my_contacts.push(ref);
						}
					});
				}
				else if(data.group){
					socket.broadcast.to(data.group).send(JSON.stringify(data));
				}
			});
		});


		// Add personal identifying data,
		// Typically this is one of
		// `facebook_id`@facebook
		// `windows_id`@windows
		// `google_id`@google
		// email@address.com
		socket.on('me',function(data){
			// Add data to the contacts array
			if(!(data instanceof Array)){
				data = [data];
			}
			data.forEach(function(ref){
				if(!(ref in profiles)){
					profiles[ref] = [];
				}

				// Has this already been added?
				if(profiles[ref].indexOf(socket.id)>=0){
					return;
				}

				profiles[ref].push(socket.id);

				my_profiles.push(ref);

				// Is anyone listening for this user?
				if(ref in pending){
					// Loop through and deliver pending messages
					pending[ref].forEach(function(data){
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


		socket.on('disconnect', function(){

			// Loop through profiles
			my_profiles.forEach(function(ref){
				// If this was the last socket to define this then
				var i = profiles[ref].indexOf(socket.id);
				if(i>-1){
					// remove from global profiles hash
					profiles[ref].splice(profiles[ref].indexOf(socket.id),1);

					// Is the profiles hash now empty
					if(profiles[ref].length===0){
						// remove from the profile list
						delete profiles[ref];
					}
				}
			});

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

			// Broadcast disconnect to group
			if(_group){
				socket.broadcast.to(_group).send(JSON.stringify({
					type : 'disconnect',
					from : socket.id
				}));
			}

			// Broadcast disconnect to anyone you've sent a message too.
			if(recipients[socket.id].length>0){
				recipients[socket.id].forEach(function(id){
					send(id, {
						type : 'disconnect',
						from : socket.id
					});
				});
				delete recipients[socket.id];
			}
		});
	});
}