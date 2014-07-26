var peer = require('./server/app.js');

var connect = require('connect');
var server = connect().use( connect.static( __dirname + '/src') );
var http_port = process.env.PORT || 5000;
var https_port = process.env.PORT || 5001;

// SSL switch for production/localhost
if(process.env.NODE_ENV==='production'){
	// Just listen
	// See https://devcenter.heroku.com/articles/ssl-endpoint for adding SSL Certificates
	var app = server.listen( http_port );
	// Start the peer server and bind listener
	peer(app);
}
else{
	// For localhost
	// HTTP
	var http = require('http');
	var app = http.createServer(server).listen(http_port);
	console.log("HTTP server on port "+http_port);
	// Start the peer server and bind listener
	peer(app);

	// HTTPS
	var https = require('https');
	var fs = require('fs');
	var options = {
		key : fs.readFileSync('./ssl/localhost.key').toString(),
		cert : fs.readFileSync('./ssl/localhost.cert').toString()
	};
	var app = https.createServer(options, server).listen( https_port );
	// Start the peer server and bind listener
	peer(app);
	console.log("HTTPS server on port "+ https_port );
}


// Notify all has started
console.log("Peer.js HTTP server on port "+http_port);
console.log("Peer.js HTTPS server on port "+https_port);
