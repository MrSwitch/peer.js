define([
	'models/stream',
	'utils/events'
], function(Streams, Events){


	var Peer = function(){

		// Simulate the peer object
		var peer = new Events();

		// Peer needs the send method
		peer.send = function(){
//			console.log(arguments);
		};

		// Bind threads to it.
		Streams.call(peer);

		return peer;
	};



	describe("models/streams", function(){

		var peer;

		before(function(){
			// Simulate the peer object
			peer = Peer();
		});


		it("should extend the peer object with streams (Hash) and stream (Method)", function(){

			// Threads collection

			expect(peer).to.have.property('streams');
			expect(peer.streams).to.be.an(Object);


			// Threads function for augmenting

			expect(peer).to.have.property('stream');
			expect(peer.stream).to.be.a(Function);

		});

		it("should trigger stream on 'stream:connect', 'stream:change', 'stream:change'", function(){

			var spy = sinon.spy();
			peer.stream = spy;

			['stream:connect', 'stream:change', 'stream:change', 'stream:offer', 'stream:makeoffer'].forEach(function(event_name){
				spy.reset();
				peer.emit(event_name);
				expect( spy.calledOnce ).to.be.ok();
			});

		});


	});

});