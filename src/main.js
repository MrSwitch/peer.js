'use strict';

// PeerJS
// WebRTC Client Controler
// @author Andrew Dodson (@mr_switch)
// @since July 2012
//

import Events from 'tricks/object/pubsub';
import extend from 'tricks/object/extend';
import featureDetect from './lib/featureDetect';
import Socket from './models/socket';
import Presence from './models/presence';
import Threads from './models/threads';
import Stream from './models/stream';
import Files from './models/files';
import Localmedia from './models/localmedia';

let STUN_SERVER = "stun:stun.l.google.com:19302";
let peer = Object.create(new Events());

extend(peer, {

	// Defaults
	stun_server : STUN_SERVER,

	// DataChannel
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
window.addEventListener('beforeunload', () => {
	// Tell everyone else of the session close.
	peer.disconnect();
});
