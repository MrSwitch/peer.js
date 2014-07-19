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

		it("should execute peer.send when thread() is called with thread:connect, and a data object", function(){

			var spy = sinon.spy();

			peer.send = spy;
			
			peer.thread();

			expect(spy.calledOnce).to.be.ok();

			expect(spy.args[0][0]).to.be.eql('thread:connect');
			expect(spy.args[0][1]).to.have.property('thread');
			expect(spy.args[0][1].thread).to.be.ok();
			expect(spy.args[0][1]).to.have.property('constraints');
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

	describe("models/threads also initiates 'stream' events", function(){

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

			// Set one peer to listen to stream:connect events
			peer.on('stream:change',spy);

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
			expect(data.remote).to.be.eql({});


			// Trigger a constraints change in a remote
			peer.emit('thread:change',{
				thread: threadID,
				from : remoteID,
				constraints : {
					video : true
				}
			});


			// Test update
			expect(spy.calledTwice).to.be.ok();

			data = spy.args[1][0];

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

			// Set one peer to listen to stream:connect events
			peer.on('stream:change',spy);

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
			expect(data.remote).to.be.eql({});




			// Trigger a constraints change in the local
			peer.thread(threadID, {
				video : false
			});


			// Test update
			expect(spy.calledTwice).to.be.ok();

			data = spy.args[1][0];

			// The Data object returns the ID of the stream
			expect(data.id).to.be.eql( remoteID );

			// The local stream has changed an is no longer sharing their video stream
			expect(data.local).to.be.eql({});

			// The remote peer hasn't specified what they are sharing
			expect(data.remote).to.be.eql({});

		});

	});

});