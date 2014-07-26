var peer = require('./src/app.js');

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

	// Notify all has started
	console.log("Peer.js HTTP server on port "+http_port);
	console.log("Peer.js HTTPS server on port "+https_port);

}
else{
	// For localhost
	// HTTP
	var http = require('http');
	var app = http.createServer(server).listen(http_port);
	// Start the peer server and bind listener
	peer(app);
	console.log("HTTP server on port "+http_port);

	// HTTPS
	// Do the .key and cert files exist?
	var fs = require('fs'),
		SSL_KEY = '../localhost.key',
		SSL_CERT = '../localhost.cert';

	fs.exists( SSL_KEY, function(bool){

		if(!bool)
			return;

		var https = require('https');
		var options = {
			key : fs.readFileSync(SSL_KEY).toString(),
			cert : fs.readFileSync(SSL_CERT).toString()
		};
		var app = https.createServer(options, server).listen( https_port );
		// Start the peer server and bind listener
		peer(app);
		console.log("HTTPS server on port "+ https_port );
	});
}