//
// PeerJS
// WebRTC Client Controler
// @author Andrew Dodson (@mr_switch)
// @since July 2012
//


define([
	'./utils/events',

	'./utils/extend',

	'./lib/featureDetect',

	'./models/socket',
	'./models/threads',
	'./models/stream',
	'./models/localmedia'

], function(
	Events,
	extend,
	featureDetect,
	Socket,
	Threads,
	Streams,
	LocalMedia
){

	var STUN_SERVER = "stun:stun.l.google.com:19302";




var peer = Object.create(new Events());

extend( peer, {

	//
	// Defaults
	stun_server : STUN_SERVER,

	//
	// DataChannel
	// 
	support : featureDetect,


	/////////////////////////////////////
	// TAG / WATCH LIST
	//
	tag : function(data){

		if(!(data instanceof Array)){
			data = [data];
		}

		this.send('session:tag', data );

		return this;
	},


	//
	// Add and watch personal identifications
	//
	watch : function(data){

		if(!(data instanceof Array)){
			data = [data];
		}

		this.send('session:watch', data );

		return this;
	},

});




// Expose external
window.peer = peer;

// Extend with the Web Sockets methods: connect(), send()
Socket.call(peer);

// Extend with the thread management: thread(), threads{}
Threads.call(peer);

// Extend with stream management: stream(), streams{}
Streams.call(peer);

// Extend with local Media
LocalMedia.call(peer);




// BeforeUnload

window.addEventListener('beforeunload', function(){
	// Tell everyone else of the session close.
	peer.disconnect();
});


	return peer;

});