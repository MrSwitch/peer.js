//
// Communicate with the socket server
//

function Check(count, cb){
	return function(){
		if(--count===0){
			cb();
		}
	};
}

describe("Socket Connections", function(){

	var ws= "http://localhost:5000";

	it("Should have access to Socket.IO", function(){

		// Should contain a property id
		expect( io ).to.be.an('object');

	});


	it("Should return a socket:connect connection message", function(done){

		// Connect to the socket
		var socket = io.connect( ws );

		// Define an message handling
		socket.on('message', function(data){

			// Deserialize
			data = JSON.parse(data);

			// Should contain a property id
			expect( data ).to.have.property('id');
			expect( data ).to.have.property('type', 'socket:connect');
			done();
		});
	});

	it("Should deliver messages to peers", function(done){

		var check = Check(2,done);

		// Connect to the socket
		var socketA = io.connect( ws, {'force new connection': true});
		var socketB = io.connect( ws, {'force new connection': true});

		// Define an message handling
		socketA.on('message', function(data){
			// Deserialize
			data = JSON.parse(data);

			// Should contain a property id
			if( data.type === 'fromB' ){
				expect( data ).to.have.property('from', socketB.socket.sessionid);
				check();
			}
		});

		// Define an message handling
		socketB.on('message', function(data){
			// Deserialize
			data = JSON.parse(data);

			// Should contain a property id
			if( data.type === 'fromA' ){
				expect( data ).to.have.property('from', socketA.socket.sessionid);
				check();
			}
		});

		socketA.on('connect', function(){
			socketB.send(JSON.stringify({
				type : 'fromB',
				to : socketA.socket.sessionid
			}));
		});
		socketB.on('connect', function(){
			// Send connect message
			socketA.send(JSON.stringify({
				type : 'fromA',
				to : socketB.socket.sessionid
			}));
		});
	});

	it("Should deliver thread messages", function(done){

		var check = Check(1,done);

		// Connect to the socket
		var socketA = io.connect( ws, {'force new connection': true});
		var socketB = io.connect( ws, {'force new connection': true});

		// Define an message handling
		socketA.on('message', function(data){
			// Deserialize
			data = JSON.parse(data);

			// Should contain a property id
			if( data.type === 'thread:connect' ){
				expect( data ).to.have.property('type', 'thread:connect');
				expect( data ).to.have.property('from', socketB.socket.sessionid);
				check();
			}
		});

		// Define an message handling
		// socketB.on('message', function(data){
		// 	// Deserialize
		// 	data = JSON.parse(data);

		// 	// Should contain a property id
		// 	if( data.type === 'thread:connect' ){
		// 		expect( data ).to.have.property('type', 'thread:connect');
		// 		expect( data ).to.have.property('from', socketA.socket.sessionid);
		// 		check();
		// 	}
		// });

		// Send connect message
		socketA.emit('thread:connect', {
			thread : 'hello'
		});
		// Send connect message
		socketB.send(JSON.stringify({
			type : 'thread:connect',
			thread : 'hello'
		}));

	});

});