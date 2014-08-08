define([
	'models/localmedia',
	'utils/events'
],function(
	LocalMedia,
	Events
){

	describe("models/localmedia", function(){

		var Peer = function(id){

			// Simulate the peer object
			var peer = new Events();

			// Bind threads to it.
			LocalMedia.call(peer);

			return peer;
		};

		this.timeout(10000);


		it("should trigger localmedia:connect when getUserMedia is initiated via addMedia", function(done){

			// Give the user 10 seconds to tick any dialogue
			// Howver run this through an https server or open the browser with flags 

			var peerA = Peer();
			var spy = sinon.spy();

			peerA.addMedia(spy);

			peerA.on('localmedia:connect', function(stream){
				expect(spy.calledOnce).to.be.ok();
				expect(stream).to.be.an(Object);
				done();
			});

		});

		it("should trigger localmedia:disconnect when stream.stop() is invoked", function(done){

			// Give the user 10 seconds to tick any dialogue
			// Howver run this through an https server or open the browser with flags 

			var peerA = Peer();

			peerA.addMedia();

			peerA.on('localmedia:disconnect', function(){
				// This should have triggered this localmedia:disconnect event
				done();
			});
			peerA.on('localmedia:connect', function(stream){
				// Stop the stream immediatly
				stream.stop();
			});

		});
	});

});