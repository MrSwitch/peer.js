var fs = require('fs');
var path = require('path');
var peer = require('./peer-server.js');

var port=process.env.PORT || 5000;
var http=require('http');
var root = __dirname.match(/[a-z]+$/)[0];

var app=http.createServer(function(req,res){

	//    res.write("server listening to port:"+port);
	//    res.end();
	//    return;

	var filePath = '.' + req.url;
	if (filePath == './')
		filePath = './index.html';

	filePath = root +'/'+filePath;

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

// Start the peer server and bind listener
peer(app);