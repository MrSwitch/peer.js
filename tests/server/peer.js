//
// Test the socket server implementation
// Run from root with using command 'npm test'
//
// @author Andrew Dodson
// @since July 2013
//
//
var expect = require("expect.js");
var sinon = require("sinon");
	
var Peer;

beforeEach(function(){
	Peer = require("../../server/peer.js");
});



describe('Peer Socket Constructor', function(){

	it("Peer.peers should the current number of peers created ", function(){

		var peer = new Peer(1);

		// Should not expose the constructor methods
		expect( peer ).to.not.have.property( 'peers' );

		// Should be an instance
		expect( Peer.peers ).to.be.an( Object );

		// Contain the method 'send'
		expect( Peer.peers[1] ).to.be.equal( peer );

		// Close
		peer.close();

	});

	it("Peer.threads should show number of threads created ", function(){

		var peer = new Peer(1);

		var thread_id = 'threadzzz';

		peer.send({
			thread : thread_id
		});

		// Should not expose the constructor methods
		expect( Peer ).to.have.property( 'threads' );

		// Should be an instance
		expect( Peer.threads ).to.be.an( Object );

		// Contain the method 'send'
		expect( Peer.threads ).to.have.property( thread_id );

		// Close
		peer.close();

	});

});




describe('Peer Socket Core', function(){

	it("should return an instance of Peer", function(){

		var peer = new Peer(1);

		// Should be an instance
		expect( peer ).to.be.a( Peer );

		// Contain the method 'send'
		expect( peer.send ).to.be.a('function');

		// Contain the method 'close'
		expect( peer.close ).to.be.a('function');

		peer.close();

	});

	it("should be able to pick up an existing peer by id", function(){

		var peer = new Peer(1);
		var peer1 = new Peer(1);
		var peer2 = new Peer(2);

		// Should be an instance
		expect( peer ).to.be.equal( peer1 );

		// Should be an instance
		expect( peer ).to.not.be.equal( peer2 );

		peer.close();
		peer1.close();
		peer2.close();

	});


	it("should be able to send a message from one peer to another", function(){

		var spy = sinon.spy(function(obj){
			// Should be an instance
			expect( obj ).to.have.property( 'type', 'message' );
		});
		
		var peer2 = new Peer(2);
		peer2.onmessage = spy;


		var peer1 = new Peer(1);
		peer1.send({
			type : 'message',
			to : 2
		});

		expect( spy.callCount ).to.be.eql( 1 );

		// Clean up
		delete peer2.onmessage;
		peer1.close();
		peer2.close();
	});


	it("should be able to close and remove  all attributes of a peer", function(){
		
		var handler = function(obj){};

		var peer = new Peer(2);
		peer.onmessage = handler;
		peer.tags = Array(1);
		delete peer.onmessage;
		peer.close();

		// Assign another value,
		// should not inherit
		peer = new Peer(2);

		expect( peer.tags ).to.be.empty();

	});

});



describe('Peer Socket thread', function(){

	var peer1, peer2, peer3;

	beforeEach(function(){

		// intiates a peer
		peer1 = new Peer(1);

		// Joins a thread
		peer1.send({
			type : 'thread:connect',
			thread : 111
		});


		// listens out to new connections
		peer2 = new Peer(2);

		peer2.send({
			type : 'thread:connect',
			thread : 111
		});

		// listens out to new connections
		peer3 = new Peer(3);

	});

	afterEach(function(){

		// remove this handler otherwise it'll recieve the disconnect
		delete peer1.onmessage;
		delete peer2.onmessage;
		delete peer3.onmessage;

		// Close the peer
		peer1.close();
		peer2.close();
		peer3.close();

	});


	it("should send thread:connect messages to other members", function(done){

		// intiates a peer
		peer1.onmessage = function(obj){
			// Should be an instance
			expect( obj ).to.have.property( 'type', 'thread:connect' );
			expect( obj ).to.have.property( 'from', 3 );

			done();
		};


		peer3.send({
			type : 'thread:connect',
			thread : 111
		});

	});


	it("should send thread:disconnect messages to other members", function(done){

		// intiates a peer
		peer1.onmessage = function(obj){
			// Should be an instance
			expect( obj ).to.have.property( 'type', 'thread:disconnect' );
			expect( obj ).to.have.property( 'from', 2 );
			done();
		};

		peer2.send({
			type : 'thread:disconnect',
			thread : 111
		});
	});

});






describe('Peer Socket Tag/Watch', function(){

	var peer1, peer2, peer3, peer4;

	beforeEach(function(){

		// intiates a peer
		peer1 = new Peer(1);

		// listens out to new connections
		peer2 = new Peer(2);

		// listens out to new connections
		peer3 = new Peer(3);

		peer4 = new Peer(4);

	});

	afterEach(function(){

		// remove this handler otherwise it'll recieve the disconnect
		delete peer1.onmessage;
		delete peer2.onmessage;
		delete peer3.onmessage;
		delete peer4.onmessage;

		// Close the peer
		peer1.close();
		peer2.close();
		peer3.close();
		peer4.close();

	});


	it("should tag users by session:tag", function(){

		var tag = 'lauren.ipson@gmail.com';

		peer1.send({
			type : 'session:tag',
			tag : [tag]
		});


		expect( peer1.tags ).to.contain( tag );
	});



	it("should pass through messages to users who have themsleves via session:tag", function(done){

		var tag = 'lauren.ipson@gmail.com';

		// Listen to the message
		peer1.onmessage = function(obj){
			expect( obj ).to.have.property( 'type', 'watching you' );
			done();
		};

		// identify the first user with the tag
		peer1.send({
			type : 'session:tag',
			tag : [tag]
		});

		// Send a message through to that user
		peer2.send({
			type : 'watching you',
			to : [tag, 'random']
		});
	});



	it("should pass through pending messages once the user has tagged themselves", function(){

		var tag = 'lauren.ipson@gmail.com';

		var spy = sinon.spy(function(obj){
			expect( obj ).to.have.property( 'type', 'watching you' );
		});


		// Listen to the message
		peer1.onmessage = spy;
		peer2.onmessage = spy;


		// Send a message to a user who has not identified themselves
		peer3.send({
			type : 'watching you',
			to : [tag, 'random']
		});


		// identify the first user with the tag
		peer1.send({
			type : 'session:tag',
			tag : [tag]
		});

		expect( spy.callCount ).to.be.eql( 1 );


		// identify the first user with the tag
		peer2.send({
			type : 'session:tag',
			tag : [tag]
		});

		expect( spy.callCount ).to.be.eql( 2 );


		// Let anothe watcher be passed through
		
		peer4.send({
			type : 'watching you',
			to : [tag, 'random']
		});


		expect( spy.callCount ).to.be.eql( 4 );

	});

});