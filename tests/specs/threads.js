define([
	'models/threads',
	'utils/events'
], function(Thread, Events){


	var Peer = function(){

		// Simulate the peer object
		var peer = new Events();

		// Peer needs the send method
		peer.send = function(){
//			console.log(arguments);
		};

		// Bind threads to it.
		Thread.call(peer);

		return peer;
	};



	describe("models/threads", function(){

		var peer;

		before(function(){
			// Simulate the peer object
			peer = Peer();
		});


		it("should extend the peer object with threads (Hash) and thread (Method)", function(){

			// Threads collection

			expect(peer).to.have.property('threads');
			expect(peer.threads).to.be.an(Object);


			// Threads function for augmenting

			expect(peer).to.have.property('thread');
			expect(peer.thread).to.be.a(Function);

		});

		it("should execute peer.send with thread:connect, and a data object, when thread() is called", function(){

			var spy = sinon.spy();

			peer.send = spy;
			
			peer.thread();

			expect(spy.calledOnce).to.be.ok();

			var args = spy.args[0],
				data = args[1];

			expect( args[0] ).to.be.eql('thread:connect');
			expect( data ).to.have.property('thread');
			expect( data.thread ).to.be.ok();
			expect( data ).to.have.property('constraints');
		});


		it("should relay back a thread:connect event to the original peer, after having received a general thread:connect from a remote host.", function(){

			var spy = sinon.spy(),
				remoteID = 2,
				threadID = 123;

			// join a group locally
			peer.thread( threadID );

			// listen to send events
			peer.send = spy;
			
			// trigger an incoming thread:connect event from a third party peer
			// this should send a thread:connect event to this user
			peer.emit('thread:connect', {
				from : remoteID,
				thread : threadID
			});

			expect(spy.calledOnce).to.be.ok();

			var args = spy.args[0],
				data = args[1];

			expect(args[0]).to.be.eql('thread:connect');
			expect( data ).to.have.property('thread');
			expect( data.thread ).to.eql( threadID );
			expect( data.to ).to.eql( remoteID );
		});

		it("should trigger thread:connect locally, when thread() is called", function(){

			var spy = sinon.spy();

			peer.on('thread:connect',spy);

			peer.thread();

			expect(spy.calledOnce).to.be.ok();

			var response = spy.args[0][0];

			expect( response ).to.be.an( Object );
			expect( response ).to.have.property( 'thread' );
			expect( response ).to.have.property( 'constraints' );
		});

		it("should trigger thread:change, when thread() constraints are changed", function(){

			var spy = sinon.spy(),
				id = 123;

			peer.on('thread:change',spy);

			peer.thread(id);

			expect(spy.called).to.not.be.ok();

			peer.thread(id,{
				video : true
			});

			expect(spy.calledOnce).to.be.ok();

			var response = spy.args[0][0];
			expect( response ).to.be.an( Object );
			expect( response ).to.have.property( 'thread' );
			expect( response ).to.have.property( 'constraints' );
		});
	});

	describe("models/threads also initiate 'stream' events", function(){

		var peer;

		beforeEach(function(){
			// Initiate peer
			peer = Peer();
		});


		it("should trigger stream:change when a user receives a thread:connect event from a peer.", function(){

			var spy = sinon.spy(),
				threadID = 123,
				remoteID = 2;

			// Peer1
			// Set one peer to listen to stream:connect events
			peer.on('stream:change',spy);

			// Join thread
			peer.thread(threadID,{
				video : true
			});

			// No stream:connect should have occured
			expect(spy.called).to.not.be.ok();

			// Imitate an incoming thread:connect from another user
			peer.emit('thread:connect', {
				thread: threadID,
				from : remoteID
			});


			// The peer will add this second peer to its internal collection
			// It will see that this peer has not been added before,
			// triggering a stream:connect, to initiate a RTC Stream 

			expect(spy.calledOnce).to.be.ok();

			// The stream:connect data contains the constraints with which to define the type of connection we're setting up here
			// The Constraints should say what the local peer is sharing and what the remote peer is offering to share with us.

			var data = spy.args[0][0];

			// The Data object returns the ID of the stream
			expect(data.id).to.be.eql(remoteID);

			// In this case the local peer is offering to share its video stream
			expect(data.local).to.be.eql({video:true});

			// The remote peer hasn't specified what they are sharing
			expect(data.remote).to.have.eql({});

		});
		

		it("should trigger a stream:change when a thread:change event occurs", function(){

			var spy = sinon.spy(),
				threadID = 123,
				remoteID = 2;

			// Peer1
			// Join thread
			peer.thread(threadID,{
				video : true
			});

			// Imitate an incoming thread:connect from another user
			peer.emit('thread:connect', {
				thread: threadID,
				from : remoteID
			});

			// Set one peer to listen to stream:connect events
			peer.on('stream:change',spy);

			// Trigger a constraints change in a remote
			peer.emit('thread:change',{
				thread: threadID,
				from : remoteID,
				constraints : {
					video : true
				}
			});


			// Test update
			expect(spy.calledOnce).to.be.ok();

			data = spy.args[0][0];

			// The Data object returns the ID of the stream
			expect(data.id).to.be.eql( remoteID );

			// In this case the local peer is offering to share its video stream
			expect(data.local).to.be.eql({video:true});

			// The remote peer hasn't specified what they are sharing
			expect(data.remote).to.be.eql({video:true});

		});


		it("should trigger a stream:change when the local peers thread is changed", function(){

			var spy = sinon.spy(),
				threadID = 123,
				remoteID = 2;

			// Peer1
			// Join thread
			peer.thread(threadID,{
				video : true
			});

			// Imitate an incoming thread:connect from another user
			peer.emit('thread:connect', {
				thread: threadID,
				from : remoteID
			});


			// Set one peer to listen to stream:connect events
			peer.on('stream:change',spy);

			// Trigger a constraints change in the local
			peer.thread(threadID, {
				video : false
			});


			// Test update
			expect(spy.calledOnce).to.be.ok();

			data = spy.args[0][0];

			// The Data object returns the ID of the stream
			expect(data.id).to.be.eql( remoteID );

			// The local stream has changed an is no longer sharing their video stream
			expect(data.local).to.be.eql({});

			// The remote peer hasn't specified what they are sharing
			expect(data.remote).to.be.eql({});

		});

		it("should calculate the minimum required stream constraints for a required peer connection", function(){

			var spy = sinon.spy(),
				threadID = 123,
				threadID2 = 1234,
				remoteID = 2;

			// Join two threads, one whilst sharing video and the other with
			peer.thread( threadID, {
				video : true
			});
			peer.thread( threadID2, {
				video : false
			});


			// Imitate an incoming thread:connect from another user
			peer.emit('thread:connect', {
				thread: threadID,
				from : remoteID
			});
			peer.emit('thread:connect', {
				thread: threadID2,
				from : remoteID
			});


			// Set one peer to listen to stream:connect events
			peer.on('stream:change',spy);

			// Change the local thread constaints to hide the video
			peer.thread( threadID2, {
				video : false
			});

			// Test update
			var data;
			data = spy.args[0][0];
			expect( data.id ).to.be.eql( remoteID );
			expect( data.local ).to.be.eql( { video : true } );
			expect( data.remote ).to.be.eql( {} );



			// Disable the one enabled local video stream 
			peer.thread( threadID, {
				video : false
			});

			// Test update
			data = spy.args[1][0];
			expect( data.id ).to.be.eql( remoteID );
			expect( data.local ).to.be.eql( {} );
			expect( data.remote ).to.be.eql( {} );



			// Enable video stream from remote user
			peer.emit( 'thread:change', {
				from : remoteID,
				thread : threadID,
				constraints : {
					video : true
				}
			});

			// Test update
			data = spy.args[2][0];
			expect( data.id ).to.be.eql( remoteID );
			expect( data.local ).to.be.eql( {} );
			expect( data.remote ).to.be.eql( { video : true } );



			// Enable video stream from remote user
			peer.emit( 'thread:change', {
				from : remoteID,
				thread : threadID2,
				constraints : {
					video : false
				}
			});

			// Test update
			data = spy.args[2][0];
			expect( data.id ).to.be.eql( remoteID );
			expect( data.local ).to.be.eql( {} );
			expect( data.remote ).to.be.eql( { video : true } );


		});

	});

});