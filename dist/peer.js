(function (window, document, navigator) {
    var utils_events = function () {
            var separator = /[\s\,]+/;
            var WILDCHAR = '*';
            // EVENTS
            // Extend the function we do have.
            function Events() {
                this.events = {};
                this.callback = [];
            }
            // Return
            // @param event_name string
            // @param callback function
            Events.prototype.on = function (name, callback) {
                // If there is no name
                if (name === true) {
                    callback.call(this);
                } else if (typeof name === 'object') {
                    for (var x in name) {
                        this.on(x, name[x]);
                    }
                } else if (name.match(separator)) {
                    for (var i = 0, a = name.split(separator); i < a.length; i++) {
                        this.on(a[i], callback);
                    }
                } else {
                    if (callback) {
                        // Set the listeners if its undefined
                        if (!this.events[name]) {
                            this.events[name] = [];
                        }
                        // Append the new callback to the listeners
                        this.events[name].push(callback);
                    }
                }
                return this;
            };
            // One
            // One is the same as On, but events are only fired once and must be reestablished afterwards
            Events.prototype.one = function (name, callback) {
                var self = this;
                this.on(name, function once() {
                    self.off(name, once);
                    callback.apply(self, arguments);
                });
            };
            // Trigger Events defined on the publisher widget
            Events.prototype.emit = function (name, evt, callback) {
                var self = this;
                if (!name) {
                    throw name;
                }
                var preventDefault;
                // define prevent default
                evt = evt || {};
                evt.preventDefault = function () {
                    preventDefault = true;
                };
                var a = name.split(separator);
                a.push(WILDCHAR);
                for (var i = 0; i < a.length; i++) {
                    var _name = a[i];
                    var _events = this.events[_name];
                    if (_events) {
                        for (var j = 0; j < _events.length; j++) {
                            var _event = _events[j];
                            if (_event) {
                                var args = [
                                        evt,
                                        callback
                                    ];
                                if (_name === WILDCHAR) {
                                    args.unshift(name);
                                }
                                _event.apply(self, args);
                            }
                        }
                    }
                }
                // Defaults
                if (!preventDefault && 'default:' + name in this.events) {
                    this.events['default:' + name].forEach(function (o, i) {
                        if (o) {
                            o.call(self, evt, callback);
                        }
                    });
                }
                return this;
            };
            // Remove a callback
            Events.prototype.off = function (event_names, callback) {
                var a = event_names.split(separator);
                for (var j = 0; j < a.length; j++) {
                    var name = event_names[i];
                    if (this.events[name]) {
                        for (var i = 0; i < this.events[name].length; i++) {
                            if (this.events[name][i] === callback) {
                                this.events[name][i] = null;
                            }
                        }
                    }
                }
            };
            return Events;
        }();
    var utils_extend = function extend(r, replace) {
        var x, a = Array.prototype.splice.call(arguments, 1);
        for (var i = 0; i < a.length; i++) {
            replace = a[i];
            if (typeof r === 'object' && typeof replace === 'object') {
                for (x in replace) {
                    //if(b.hasOwnProperty(x)){
                    r[x] = extend(r[x], replace[x]);
                }
            } else {
                r = replace;
            }
        }
        return r;
    };
    var utils_PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    var lib_featureDetect = function (PeerConnection) {
            var pc, channel;
            try {
                // raises exception if createDataChannel is not supported
                pc = new PeerConnection({ 'iceServers': [{ 'url': 'stun:localhost' }] });
                channel = pc.createDataChannel('supportCheck', { reliable: false });
                channel.close();
                pc.close();
            } catch (e) {
            }
            return {
                rtc: !!pc,
                datachannel: !!channel
            };
        }(utils_PeerConnection);
    var utils_getScript = function (url, callback) {
        // Load socketIO
        var script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onreadystatechange = function () {
            if (this.readyState == 'complete') {
                callback();
            }
        };
        script.onload = callback;
        var ref = document.getElementsByTagName('script')[0];
        var parent = ref.parentNode;
        if (parent) {
            parent.insertBefore(script, ref);
        }
    };
    var models_socket = function (getScript) {
            var callbacks = [];
            return function () {
                var self = this;
                //
                // Initiate the socket connection
                //
                this.init = function (ws, callback) {
                    //
                    var connected;
                    // What happens on connect
                    var onload = function () {
                        if (connected) {
                            return;
                        }
                        connected = false;
                        // Connect to the socket
                        socket = io.connect(ws);
                        // Define an message handling
                        socket.on('message', function (data) {
                            // Deserialize
                            data = JSON.parse(data);
                            // Look for callbacks
                            if ('callback_response' in data) {
                                var i = data.callback_response;
                                delete data.callback_response;
                                callbacks[i](data);
                                return;
                            }
                            self.emit.call(self, data.type, data, function (o) {
                                // if callback was defined, lets send it back
                                if ('callback_id' in data) {
                                    o.to = data.from;
                                    o.callback_response = data.callback_id;
                                    socket.send(JSON.stringify(o));
                                }
                            });
                        });
                    };
                    // Load SocketIO if it doesn't exist
                    if (typeof io === 'undefined') {
                        getScript((ws || '') + '/socket.io/socket.io.js', onload);
                    }
                    // Loaded
                    if (callback) {
                        this.one('socket:connect', callback);
                    }
                    return this;
                };
                // Disconnect
                this.disconnect = function () {
                    if (socket) {
                        socket.disconnect();
                    }
                };
                //
                // Send information to the socket
                //
                this.send = function (name, data, callback) {
                    //
                    if (typeof name === 'object') {
                        callback = data;
                        data = name;
                        name = data.type;
                    } else {
                        data.type = name;
                    }
                    var callback_id;
                    // Add callback
                    if (callback) {
                        // Count
                        data.callback_id = callbacks.length;
                        callbacks.push(callback);
                    }
                    var action = function () {
                        socket.send(JSON.stringify(data));
                    };
                    if (this.id) {
                        action();
                    } else {
                        self.one('socket:connect', action);
                    }
                    return this;
                };
                self.one('socket:connect', function (e) {
                    self.id = e.id;
                });
            };
        }(utils_getScript);
    var models_presence = function () {
        /////////////////////////////////////
        // TAG / WATCH LIST
        //
        this.tag = function (data) {
            if (!(data instanceof Array)) {
                data = [data];
            }
            this.send('presence:tag', { data: data });
            return this;
        };
        //
        // Add and watch personal identifications
        //
        this.watch = function (data) {
            if (!(data instanceof Array)) {
                data = [data];
            }
            this.send('presence:watch', { to: data });
            return this;
        };
    };
    var models_threads = function (extend) {
            // A thread is a collection of the following
            function Thread(id) {
                this.id = id;
                this.constraints = {};
                this.streams = {};
                this.state = 'connect';
            }
            // Extention of the peer object
            return function () {
                //
                // A collection of threads for which this user has connected
                this.threads = {};
                //
                // Thread connecting/changeing/disconnecting
                // Control the participation in a thread, by setting the permissions which you grant the thread.
                // e.g. 
                // thread( id string, Object[video:true] )  - send 'thread:connect'		- connects this user to a thread. Broadcasts 
                // thread( id string, Object[video:false] ) - send 'thread:change'		- connects/selects this user to a thread
                // thread( id string, false )				- send 'thread:disconnect'	- disconnects this user from a thread
                //
                //
                // Typical preceeding flow: init
                // -----------------------------
                // 1. Broadcasts thread:connect + credentials - gets other members thread:connect (incl, credentials)
                // 
                // 2. Receiving a thread:connect with the users credentials
                //		- creates a peer connection (if preferential session)
                //
                //		- taking the lowest possible credentials of both members decide whether to send camera*
                //
                // Thread:change
                // -----------------------------
                // 1. Updates sessions, updates other members knowledge of this client
                //		- Broadcasts thread:change + new credentials to other members.
                //		- ForEach peer connection which pertains to this session
                //			For all the threads which this peer connection exists in determine the highest possible credentials, e.g. do they support video
                //			Add/Remove remote + local video streams (depending on credentials). Should we reignite the Connection confifuration?
                //		- This looks at all sessions in the thread and determines whether its saf
                //
                this.thread = function (id, constraints) {
                    var init = false;
                    if (typeof id === 'object' || !id) {
                        if (!constraints) {
                            constraints = id || {};
                        }
                        // Make up a new thread ID if one wasn't given
                        id = (Math.random() * 1000000000000000000).toString(36);
                    }
                    // Get the thread
                    var thread = this.threads[id];
                    // Type
                    var type;
                    // INIT
                    // Else intiiatlize the thread
                    if (!thread) {
                        // Create the thread object
                        thread = this.threads[id] = new Thread(id);
                        thread.constraints = constraints || {};
                        // Response
                        type = 'thread:connect';
                    } else if (constraints) {
                        // If this had been deleted
                        if (!thread.constraints) {
                            // reinstate it
                            thread.constraints = {};
                        }
                        // Update thread constraints
                        extend(thread.constraints, constraints);
                        // Response
                        type = 'thread:change';
                    } else if (constraints === false) {
                        // Update state
                        thread.constraints = false;
                        type = 'thread:disconnect';
                    }
                    if (type) {
                        var data = { thread: id };
                        // Constraints changed?
                        if (constraints) {
                            data.constraints = thread.constraints;
                        }
                        // Connect to a messaging group
                        this.send(type, data);
                        // Triggered locally
                        this.emit(type, data);
                    }
                    return thread;
                };
                //
                // Thread:Connect (comms)
                // When a user B has joined a thread the party in that thread A is notified with a thread:connect Event
                // Party A replies with an identical thread:connect to party B (this ensures everyone connecting is actually online)
                // Party B does not reply to direct thread:connect containing a "to" field events, and the chain is broken.
                //
                this.on('thread:connect, thread:change', function (e) {
                    // The incoming user
                    var remoteID = e.from;
                    // Must include a thread id.
                    // If this was triggered locally, it wont include the e.from field
                    if (!e.thread) {
                        // this is nonsense
                        throw Error('thread:* event fired without a thread value');
                    }
                    // Get or create a thread
                    // But it could be that the thread was somehow removed.
                    var thread = this.thread(e.thread);
                    if (!remoteID) {
                        // this is a local update
                        // let all the streams in the thread know
                        for (remoteID in thread.streams) {
                            updatePeerConnection.call(this, remoteID);
                        }
                        // Lets not do anything.
                        return;
                    }
                    // Establish/Update a session for the thread
                    if (!(remoteID in thread.streams)) {
                        // Set the default
                        thread.streams[remoteID] = e.constraints || {};
                    } else {
                        // The stream object contains the constraints for that user
                        // Lets apply the constraints from this connection too that user.
                        extend(thread.streams[remoteID], e.constraints || {});
                    }
                    // Trigger a review of this peer connection
                    updatePeerConnection.call(this, remoteID);
                    // SEND THREAD:CONNECT
                    // Was this a direct message?
                    if (!e.to) {
                        // Send a thread:connect back to the remote
                        var data = {
                                to: remoteID,
                                thread: thread.id,
                                constraints: thread.constraints
                            };
                        this.send('thread:connect', data);
                    }
                });
                // thread:disconnect
                // When a member disconnects from a thread we get a thread:disconnect event
                this.on('thread:disconnect', function (e) {
                    // Get thread
                    var thread = this.threads[e.thread];
                    var remoteID;
                    // Is from a remote peer
                    if ('from' in e) {
                        remoteID = e.from;
                        // From a remote peer removing their thread connection
                        if (remoteID in thread.streams) {
                            delete thread.streams[remoteID];
                            // Clean up sessions
                            updatePeerConnection.call(this, remoteID);
                        }
                    } else {
                        // Loop through the thread streams
                        for (remoteID in threads.stream) {
                            // Clean up peer connection
                            updatePeerConnection.call(this, remoteID);
                        }
                    }
                });
                // For all the active peers pertaining to multiple threads, determine whether the connection setting have changed.
                // 
                // This is done my looping through all threads to find the session for a particular peer
                // Building a list of the maximum constraint connection requirements for that remote peer.
                // Whilst building a maximum constraints for the local peer for where the remote peer is in the same thread.
                // Trigger a stream:change event with the constraints from the aforementioned two maxiumm requirements
                function updatePeerConnection(remoteID) {
                    // Placeholder to store the minimal requirement for this peer
                    var local = {}, remote = {};
                    // Start looping through the threads
                    // And then the streams
                    for (var threadId in this.threads) {
                        var thread = this.threads[threadId];
                        var streams = thread.streams;
                        // Is this peer not associated with the current thread
                        if (!(remoteID in streams)) {
                            // Look at the next thread
                            continue;
                        }
                        // REMOTE
                        extendProperties(remote, streams[remoteID]);
                        // LOCAL
                        extendProperties(local, thread.constraints);
                    }
                    // Once all the stream credentials have been scooped up...
                    // Emit a stream:change event
                    this.emit('stream:change', {
                        id: remoteID,
                        local: local,
                        remote: remote
                    });
                }
            };
            function extendProperties(a, b) {
                if (!b) {
                    return;
                }
                for (var constraint in b) {
                    var value = b[constraint];
                    // If the constraint is true
                    if (value) {
                        // Update a
                        a[constraint] = value;
                    }
                }
            }
        }(utils_extend);
    var utils_RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    var utils_merge = function (extend) {
            return function (r) {
                var x, a = Array.prototype.splice.call(arguments, 0);
                a.unshift({});
                return extend.apply(null, a);
            };
        }(utils_extend);
    var utils_isEqual = function isEqual(a, b) {
        var x;
        if (typeof a !== typeof b) {
            return false;
        } else if (typeof a === 'object') {
            for (x in a) {
                if (!isEqual(a[x], b[x])) {
                    return false;
                }
            }
            for (x in b) {
                if (!(x in a)) {
                    return false;
                }
            }
        }
        return a === b;
    };
    var models_stream = function (PeerConnection, RTCSessionDescription, extend, merge, isEqual, Events) {
            // Default Constraints
            var default_constraints = { video: false };
            var config = {
                    'optional': [],
                    'mandatory': {
                        'OfferToReceiveAudio': true,
                        'OfferToReceiveVideo': true
                    }
                };
            var media;
            // Extend our Global object with the stream methods, collections and listeners
            return function () {
                // A collection of Peer Connection streams
                this.streams = {};
                // Stream
                // Establishes a connection with a user
                this.stream = function (id, constraints, offer) {
                    if (!id) {
                        throw 'streams(): Expecting an ID';
                    }
                    // Does this stream exist?
                    var stream = this.streams[id];
                    if (!stream) {
                        // Create a new stream
                        stream = this.streams[id] = Stream(id, constraints, this.stun_server, this);
                        // Update an existing stream with fresh constraints
                        if (constraints) {
                            stream.setConstraints(constraints);
                        }
                        // Output pupblished events from this stream
                        stream.on('*', this.emit.bind(this));
                        // Control
                        // This should now work, will have to reevaluate
                        this.on('localmedia:connect', stream.addStream);
                        this.on('localmedia:disconnect', stream.removeStream);
                        //
                        // Add the current Stream
                        if (this.localmedia) {
                            stream.addStream(this.localmedia);
                        }
                        // intiiate the PeerConnection controller
                        // Add the offer to the stream
                        stream.open(offer || null);
                        return stream;
                    } else if (constraints) {
                        // Update an existing stream with fresh constraints
                        stream.setConstraints(constraints);
                    } else if (offer !== undefined) {
                        stream.open(offer);
                    }
                    return stream;
                };
                //////////////////////////////////////////////////
                // CHANNEL MESSAGING
                //////////////////////////////////////////////////
                // Store the socket send function
                var socketSend = this.send;
                // Change it
                this.send = function (name, data, callback) {
                    if (typeof name === 'object') {
                        callback = data;
                        data = name;
                        name = data.type;
                    }
                    var recipient = data.to, stream = this.streams[recipient];
                    if (recipient && stream && stream.channel && stream.channel.readyState === 'open') {
                        if (name) {
                            data.type = name;
                        }
                        var str = JSON.stringify(data);
                        try {
                            stream.channel.send(str);
                            return;
                        } catch (e) {
                            // Other party could have disappeared
                            // code: 19
                            // message: "Failed to execute 'send' on 'RTCDataChannel': Could not send data"
                            // name: "NetworkError"
                            stream.channel = null;
                            // Retrigger the stream channel creation
                            this.stream(recipient, null, null);
                        }
                    }
                    // Else fallback to the socket method
                    socketSend.call(this, name, data, callback);
                };
                //////////////////////////////////////////////////
                // STREAMS
                //////////////////////////////////////////////////
                // stream:connect
                // pass through any stream connection events
                this.on('stream:connect, stream:change, stream:constraints', function (e) {
                    // What has changed
                    var constraints = {};
                    // we have information on what the remote constraints are
                    if (e.remote) {
                        constraints.remote = merge(default_constraints, e.remote);
                    }
                    // We have the local constraints
                    // Let also check that this has no-from field
                    if (e.local && !e.from) {
                        constraints.local = merge(default_constraints, e.local);
                    }
                    // Create/Update the stream with the constraints offered.
                    this.stream(e.from || e.id, constraints);
                });
                // stream:offer
                // A client has sent a Peer Connection Offer
                // An Offer Object:
                //  -  string: SDP packet, 
                //  -  string array: contraints
                this.on('stream:offer, stream:makeoffer', function (e) {
                    // Creates a stream:answer event
                    this.stream(e.from, null, e.data || null);
                });
                //
                // stream:answer
                // 
                this.on('stream:answer', function (e) {
                    this.streams[e.from].pc.setRemoteDescription(new RTCSessionDescription(e.data));
                });
                // 
                // Relay ice Candidates
                //
                this.on('stream:candidate', function (e) {
                    var uid = e.from, data = e.data, stream = this.streams[uid];
                    if (!stream) {
                        console.error('Candidate needs initiation');
                        return;
                    }
                    var candidate = new RTCIceCandidate({
                            sdpMLineIndex: data.label,
                            candidate: data.candidate
                        });
                    try {
                        stream.pc.addIceCandidate(candidate);
                    } catch (err) {
                        console.error('Failed to set iceCandidate');
                        console.error(candidate);
                        console.error(err);
                    }
                });
                // Listen to change to the local media, and remove it streams if this occurs
                this.on('localmedia:disconnect', function (mediastream) {
                    // Loop through streams and call removeStream
                    for (var x in this.streams) {
                        this.streams[x].pc.removeStream(mediastream);
                    }
                });
                // Channels
                this.on('channel:connect', function (e) {
                });
                // 
                this.on('channel:message', function (data) {
                    if ('callback_response' in data) {
                        var i = data.callback_response;
                        delete data.callback_response;
                        this.callback[i].call(peer, data);
                        return;
                    }
                    var type = data.type;
                    this.emit(type, data, function (o) {
                        // if callback was defined, lets send it back
                        if ('callback' in data) {
                            o.to = data.from;
                            o.callback_response = data.callback;
                            this.send(o);
                        }
                    });
                });
            };
            // ////////////////////////////////////////////////////////////
            //
            //
            // Individual stream controller
            //
            //
            // ////////////////////////////////////////////////////////////
            function Stream(id, constraints, STUN_SERVER, peer) {
                // Operations
                // Once the RTCPeerConnection object has been initialized, for every call to createOffer, setLocalDescription, createAnswer and setRemoteDescription; execute the following steps:
                // Append an object representing the current call being handled (i.e. function name and corresponding arguments) to the operations array.
                // If the length of the operations array is exactly 1, execute the function from the front of the queue asynchronously.
                // When the asynchronous operation completes (either successfully or with an error), remove the corresponding object from the operations array. 
                //  - After removal, if the array is non-empty, execute the first object queued asynchronously and repeat this step on completion.
                var operations = [];
                function operation(func) {
                    // Add operations to the list
                    if (func) {
                        operations.push(func);
                    } else {
                    }
                    // Are we in a stable state?
                    if (pc.signalingState === 'stable') {
                        // Pop the operation off the front.
                        var op = operations.shift();
                        if (op) {
                            op();
                        }
                    } else {
                    }
                }
                var pc, stream = new Events();
                // Creating an offer is a little fraught with dnager if the other party does so too
                // To mitigate the problems lets turn on a flag when the master client (determined arbitarily from session ID)
                // Needs a negotiation that they wont process offers themselves
                var MASTER = id < peer.id;
                // Null
                stream.channel = null;
                // Default constraints
                stream.constraints = {
                    remote: {},
                    local: {}
                };
                // listen to stream change events
                stream.setConstraints = function (constraints) {
                    // If changes to the local constraint has occured
                    // deliver these to the other peer
                    var changed;
                    if (constraints.local && !isEqual(stream.constraints.local, constraints.local)) {
                        changed = true;
                    }
                    // Update constraints
                    extend(stream.constraints, constraints || {});
                    // Trigger Constraints/Media changed listener
                    toggleLocalStream();
                    // Has the local constraints changed?
                    if (changed) {
                        // Tell the thirdparty about it
                        peer.send({
                            type: 'stream:constraints',
                            remote: stream.constraints.local,
                            to: id
                        });
                    }
                };
                // Listen out for stream:disconnected
                // this is triggered by the ICE candidate state change
                // It can be used to infer that the connection has dissappeared
                // We can use it to disable a media stream
                stream.on('stream:disconnected', function () {
                    // Has a remotemedia value been proffered
                    if (stream.remotemedia) {
                        // Mimic the removal of the media
                        stream.emit('media:disconnect', stream.remotemedia);
                        // Reinstate it if the connection is reestablished
                        stream.one('stream:connected', function () {
                            stream.emit('media:connect', stream.remotemedia);
                        });
                    }
                });
                // Peer Connection
                // Initiate a local peer connection handler
                var pc_config = { 'iceServers': [{ 'url': STUN_SERVER }] }, pc_constraints = { 'optional': [{ 'DtlsSrtpKeyAgreement': true }] };
                //				stun = local ? null : Peer.stun_server;
                try {
                    //
                    // Reference this connection
                    //
                    stream.pc = pc = new PeerConnection(pc_config, pc_constraints);
                    pc.onicecandidate = function (e) {
                        var candidate = e.candidate;
                        if (candidate) {
                            peer.send({
                                type: 'stream:candidate',
                                data: {
                                    label: candidate.label || candidate.sdpMLineIndex,
                                    candidate: candidate.toSdp ? candidate.toSdp() : candidate.candidate
                                },
                                to: id
                            });
                        }
                    };
                } catch (e) {
                    console.error('PeerJS: Failed to create PeerConnection, exception: ' + e.message);
                    return stream;
                }
                pc.onsignalingstatechange = function (e) {
                    operation();
                };
                pc.oniceconnectionstatechange = function (e) {
                    console.warn('ICE-CONNECTION-STATE-CHANGE ' + pc.iceConnectionState);
                    // Determine whether the third party has ended their connection
                    stream.emit('stream:' + pc.iceConnectionState, { from: id });
                };
                //pc.addEventListener("addstream", works in Chrome
                //pc.onaddstream works in FF and Chrome
                pc.onaddstream = function (e) {
                    e.from = id;
                    stream.emit('media:connect', e);
                    stream.remotemedia = e;
                    // Listen to ended event
                    /*	e.stream.addEventListener('ended', function(){
                    		alert('ended');
                    	});*/
                    // Check to see if they are accepting video
                    toggleLocalStream();
                };
                // pc.addEventListener("removestream", works in Chrome
                // pc.onremovestream works in Chrome and FF.
                pc.onremovestream = function (e) {
                    remotemedia = null;
                    e.from = id;
                    stream.emit('media:disconnect', e);
                    // Check to see if they are accepting video
                    toggleLocalStream();
                };
                pc.ondatachannel = function (e) {
                    stream.channel = e.channel;
                    setupDataChannel(e.channel);
                };
                pc.onnegotiationneeded = function (e) {
                    // Has the signalling state changed?
                    if (pc.signalingState === 'closed') {
                        console.warn('signallingState closed');
                        return;
                    }
                    if (MASTER) {
                        // Create an offer
                        pc.createOffer(function (session) {
                            operation(function () {
                                pc.setLocalDescription(session, function () {
                                    peer.send({
                                        type: 'stream:offer',
                                        to: id,
                                        data: pc.localDescription
                                    });
                                }, errorHandler);
                            });
                        }, null, config);
                    } else {
                        // Ask the other client to make the offer
                        peer.send({
                            type: 'stream:makeoffer',
                            to: id
                        });
                    }
                };
                stream.addStream = function (_media) {
                    media = _media;
                    toggleLocalStream();
                };
                stream.removeStream = function () {
                    media = null;
                    toggleLocalStream();
                };
                stream.open = function (offer) {
                    // Is this an offer or an answer?
                    // No data is needed to make an offer
                    // Making an offer?
                    if (!offer) {
                        // Trigger onnegotiation needed
                        if (MASTER && !stream.channel) {
                            // Create a datachannel
                            // This initiates the onnegotiationneeded event
                            stream.channel = pc.createDataChannel('data');
                            setupDataChannel(stream.channel);
                        } else {
                            // trigger the fallback for on negotiation needed
                            operation(pc.onnegotiationneeded);
                        }
                    } else {
                        // if(!PROTECTED){
                        // Set the remote offer information
                        pc.setRemoteDescription(new RTCSessionDescription(offer), function () {
                            if (pc.signalingState === 'closed') {
                                console.warn('signalingState closed: during setRemoteDescription');
                                return;
                            }
                            pc.createAnswer(function (session) {
                                if (pc.signalingState === 'closed') {
                                    console.warn('signalingState closed: after createAnswer');
                                    return;
                                }
                                pc.setLocalDescription(session, function () {
                                    peer.send({
                                        type: 'stream:answer',
                                        to: id,
                                        data: pc.localDescription
                                    });
                                }, errorHandler);
                            }, null, config);
                        });
                    }
                };
                return stream;
                function errorHandler(e) {
                    console.error('SET Description failed triggered:', e);
                }
                //
                function setupDataChannel(channel) {
                    console.debug('DATACHANNEL CREATED', channel);
                    // Broadcast
                    channel.onopen = function (e) {
                        stream.emit('channel:connect', {
                            type: 'channel:connect',
                            id: id,
                            from: id,
                            to: peer.id,
                            target: e
                        });
                    };
                    channel.onmessage = function (e) {
                        var data = JSON.parse(e.data);
                        data.from = id;
                        data.to = peer.id;
                        data.target = e;
                        stream.emit('channel:message', data);
                    };
                    channel.onerror = function (e) {
                        e.id = id;
                        stream.emit('channel:error', e);
                    };
                }
                function toggleLocalStream() {
                    if (!pc || pc.readyState === 'closed') {
                        return;
                    }
                    // Do the constraints allow for media to be added?
                    if (!stream.constraints.local.video || !stream.constraints.remote.video || !media) {
                        // We should probably remove the stream here
                        pc.getLocalStreams().forEach(function (media) {
                            operation(function () {
                                pc.removeStream(media);
                            });
                        });
                        return;
                    }
                    // Has the media already been added?
                    var exit = false;
                    pc.getLocalStreams().forEach(function (_media) {
                        if (media === _media) {
                            exit = true;
                        }
                    });
                    if (exit) {
                        return;
                    }
                    // Set up listeners when tracks are removed from this stream
                    // Aka if the streams loses its audio/video track we want this to update this peer connection stream
                    // For some reason it doesn't... which is weird
                    // TODO: remove the any tracks from the stream here if this is not a regular call.
                    operation(function () {
                        // We should probably remove the stream here
                        pc.addStream(media);
                    });
                    // Add event listeners to stream
                    media.addEventListener('addtrack', function (e) {
                    });
                    // Remove track
                    media.addEventListener('removetrack', function (e) {
                    });
                }
            }
        }(utils_PeerConnection, utils_RTCSessionDescription, utils_extend, utils_merge, utils_isEqual, utils_events);
    var utils_bind = function () {
            if (!Function.prototype.bind) {
                Function.prototype.bind = function (oThis) {
                    if (typeof this !== 'function') {
                        // closest thing possible to the ECMAScript 5
                        // internal IsCallable function
                        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
                    }
                    var aArgs = Array.prototype.slice.call(arguments, 1), fToBind = this, fNOP = function () {
                        }, fBound = function () {
                            return fToBind.apply(this instanceof fNOP && oThis ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
                        };
                    fNOP.prototype = this.prototype;
                    fBound.prototype = new fNOP();
                    return fBound;
                };
            }
        }();
    var utils_getUserMedia = function (bind) {
            // Shim up the getUserMedia API
            // Wrap this to a custom variable but bind it on the navigator object to work
            var _getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia || function () {
                }).bind(navigator);
            return function getUserMedia(constraints, success, failure) {
                try {
                    _getUserMedia(constraints, success, failure);
                } catch (e) {
                    try {
                        // provide a string of constraints
                        _getUserMedia(Object.keys(constraints).join(','), success, failure);
                    } catch (_e) {
                        failure();
                    }
                }
            };
        }(utils_bind);
    var models_localmedia = function (getUserMedia) {
            return function () {
                //
                // LocalMedia
                // 
                this.localmedia = null;
                //
                // AddMedia
                //
                this.addMedia = function (successHandler, failHandler) {
                    var self = this;
                    // Create a success callback
                    // Fired when the users camera is attached
                    var _success = function (stream) {
                        // Attach stream
                        self.localmedia = stream;
                        // listen for change events on this stream
                        stream.addEventListener('ended', function () {
                            // Detect the change
                            if (!self.localmedia || self.localmedia === stream) {
                                self.emit('localmedia:disconnect', stream);
                                self.localmedia = null;
                            }
                        });
                        if (successHandler) {
                            successHandler(stream);
                        }
                        // Vid onload doesn't seem to fire
                        self.emit('localmedia:connect', stream);
                    };
                    //
                    // Has the callback been replaced with a stream
                    //
                    if (successHandler instanceof EventTarget) {
                        // User aded a media stream
                        _success(successHandler);
                        return this;
                    } else if (this.localmedia) {
                        if (successHandler) {
                            successHandler(this.localmedia);
                        }
                        return this;
                    }
                    // Call it?
                    getUserMedia({
                        audio: true,
                        video: true
                    }, _success, function (e) {
                        // Trigger a failure
                        self.emit('localmedia:failed', e);
                        failHandler();
                    });
                    return this;
                };
            };
        }(utils_getUserMedia);
    var peer = function (Events, extend, featureDetect, Socket, Presence, Threads, Streams, LocalMedia) {
            var STUN_SERVER = 'stun:stun.l.google.com:19302';
            var peer = Object.create(new Events());
            extend(peer, {
                //
                // Defaults
                stun_server: STUN_SERVER,
                //
                // DataChannel
                // 
                support: featureDetect
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
            window.addEventListener('beforeunload', function () {
                // Tell everyone else of the session close.
                peer.disconnect();
            });
            return peer;
        }(utils_events, utils_extend, lib_featureDetect, models_socket, models_presence, models_threads, models_stream, models_localmedia);
}(window, document, navigator));