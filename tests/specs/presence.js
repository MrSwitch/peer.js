define([
	'models/presence',
	'utils/events'
], function(Presence, Events){

	var peers = {};

	var Peer = function(id){

		// Simulate the peer object
		var peer = new Events();

		// Set defaults
		peer.stun_server = "stun:localhost";

		// Give it an ID
		peer.id = id;

		// Bind threads to it.
		Presence.call(peer);

		peers[id] = peer;

		return peer;
	};



	describe("models/presence", function(){

		var peer;

		afterEach(function(){
			peers = {};
		});


		describe('peer.tag( array ) - identifies current user', function(){

			it("should send 'presence:tag' event to the server", function(){

				var spy = sinon.spy(function(type, payload){
					// Threads function for augmenting
					expect(type).to.eql('presence:tag');
					expect(payload).to.have.property('data', data);
				});

				// Simulate the peer object
				var peer = Peer(1);
				peer.send = spy;
				var data = ['1'];

				// Tag
				peer.tag(data);

				expect( spy.calledOnce ).to.be.ok();
			});

			it("should convert a non-array value into an array", function(){

				var spy = sinon.spy(function(type, payload){
					console.log(payload);
					// Threads function for augmenting
					expect(payload).to.have.property('data');
					expect(payload.data).to.eql([data]);
				});

				// Simulate the peer object
				var peer = Peer(1);
				peer.send = spy;
				var data = 1;

				// Tag
				peer.tag(data);

				expect( spy.calledOnce ).to.be.ok();
			});

		});

		describe('peer.watch( array ) - listens for other identified users', function(){

			it("should send 'presence:watch' event to the server", function(){

				var spy = sinon.spy(function(type, payload){
					// Threads function for augmenting
					expect(type).to.eql('presence:watch');
					expect(payload).to.have.property('to', data);
				});

				// Simulate the peer object
				var peer = Peer(1);

				var data = ['1'];

				peer.send = spy;

				// Tag
				peer.watch(data);

				expect( spy.calledOnce ).to.be.ok();
			});

			it("should convert a non-array value into an array", function(){

				var spy = sinon.spy(function(type, payload){
					// Threads function for augmenting
					expect(payload).to.have.property('to');
					expect(payload.to).to.eql([data]);
				});

				// Simulate the peer object
				var peer = Peer(1);
				peer.send = spy;
				var data = 1;

				// Tag
				peer.watch(data);

				expect( spy.calledOnce ).to.be.ok();
			});

		});

	});

});