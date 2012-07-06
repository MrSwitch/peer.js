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

// Create a new Client
io.sockets.on('connection', function (socket) {

	// Tell the client that the connection succeeded
	socket.emit('ready');

	// Broadcast to yourself that you have entered the room
	socket.send(JSON.stringify({
		type : 'sessionConnected',
		from : socket.id
	}));

	socket.broadcast.send(JSON.stringify({
		type : 'connectionCreated',
		from : socket.id
	}));

	console.log('New connection');

    // Listen to events
    socket.on('message', function(data){

		console.log('Message Recieved');

		data = JSON.parse(data);

		data.from = socket.id;

		console.log(data);

		// How do we handle this message?
		// Does the message contain a 'to' field?
		if(data.to){
			io.sockets.socket(data.to).send(JSON.stringify(data));
		}
		else{
			socket.broadcast.send(JSON.stringify(data));
		}
    });
/*
	socket.on('disconnected', function(){
		socket.broadcast.send(JSON.stringify({
			type : 'connectionDestroyed',
			id : socket.id
		}));
	}); */
});