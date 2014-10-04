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
	'./models/presence',
	'./models/threads',
	'./models/stream',
//	'./models/files',
	'./models/localmedia'

], function(
	Events,
	extend,
	featureDetect,
	Socket,
	Presence,
	Threads,
	Streams,
//	Files,
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

});




// Expose external
window.peer = peer;

// Extend with the Web Sockets methods: connect(), send()
Socket.call(peer);

// Presence
// Tag the current session with a unique identifier so that others can be notified about your presense and you can be notified about others
Presence.call(peer);

// Extend with the thread management: thread(), threads{}
Threads.call(peer);

// Extend with stream management: stream(), streams{}
Streams.call(peer);

// Extend with local Media
LocalMedia.call(peer);

// Extend with File Transfer
// Files.call(peer);




// BeforeUnload

window.addEventListener('beforeunload', function(){
	// Tell everyone else of the session close.
	peer.disconnect();
});


	return peer;

});