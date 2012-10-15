var fs = require('fs');
var path = require('path');

var port=process.env.PORT || 5000;
var http=require('http');
var app=http.createServer(function(req,res){

	//    res.write("server listening to port:"+port);
	//    res.end();
	//    return;

	var filePath = '.' + req.url;
	if (filePath == './')
		filePath = './index.html';

	console.log('request starting: ' + filePath);

	var extname = path.extname(filePath);
	var contentType = 'text/html';
	switch (extname) {
		case '.js':
		contentType = 'text/javascript';
		break;
		case '.css':
		contentType = 'text/css';
		break;
		case '.png':
		contentType = 'image/png';
		break;
	}


	path.exists(filePath, function(exists) {

		if (exists) {
			fs.readFile(filePath, function(error, content) {
				if (error) {
					res.writeHead(500);
					res.end();
					return;
				}
				else {
					res.writeHead(200, { 'Content-Type': contentType });
					res.end(content, 'utf-8');
					return;
				}
			});
		}
		else {
			res.writeHead(404);
			res.end();
			return;
		}
	});

	//res.end();

}).listen(port);

console.log(port);

var socket=require("socket.io");
var io=socket.listen(app);

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
	socket.on('message', function(data){

		console.log('Message Recieved');

		data = JSON.parse(data);

		data.from = socket.id;

		console.log(data);

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

				// Make a local copy
				var _data = data;

				// Does the too field contain an email?
				if(id.match('@')){

					// Show Original ID ref
					_data.original_to = id;

					// Look up the field
					if(id in profiles){
						id = profiles[id];
					}
					else {
						// Store the message that we're sending to this user until they come online.
						// 
						if(!(id in pending)){
							pending[id]=[];
						}

						pending[id].push(_data);

						// Save the id of the user, so we can clean it up if you leave before they come online.
						my_contacts.push(id);
						return;
					}
				}

				// Send data
				_data.to = id;
				send(id, _data);
			});
		}
		else if(data.group){
			socket.broadcast.to(data.group).send(JSON.stringify(data));
		}
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

			profiles[ref] = socket.id;
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
				delete pending[ref];
			}
		})
	});


	socket.on('disconnect', function(){

		// Loop through profiles
		my_profiles.forEach(function(ref){
			// remove from the current profile list
			delete profiles[ref];
		});

		// Loop through contacts
		my_contacts.forEach(function(ref){
			// Remove the watch in the contacts list
			console.log(pending);
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