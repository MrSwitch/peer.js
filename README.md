
# PeerJS



PeerJS is a service which makes it easier to build a chat room using [WebRTC](http://www.w3.org/TR/webrtc/).



New thread
Toggle User Media
Mute
Picture
Exit Thread

	<video id="myvideo" onclick="toggleMedia()"></video>


``````
Add file



Share chatroom link []()

## Demo Code
The above demo takes just a few steps to implement. Firstly embed the Peer.JS script

Initiate the socket connection

```javascript
if(window.location.hostname.match("localhost")){
	peer.stun_server = "stun:localhost";
	peer.init("//localhost:500" + (window.location.protocol==='http:'?0:1));
}
else{
	peer.init();
}
```


Next, create a unique id with Math.random() for the chat room, you could hard code this if you like, but anyway, i'm generating it like so...

```javascript
	window.location.hash = (window.location.hash || parseInt(Math.random()*1e4,10).toString(16));
```


## peer.addMedia()
**connect video**. The function below addMedia(element) invokes gUM (getUserMedia) function and adds our local stream to peerjs.

```javascript
	function toggleMedia(){

		// Stop the stream
		if(peer.localmedia&&!peer.localmedia.ended){
			peer.localmedia.stop();
			return;
		}

		// Add media triggers the getUserMedia method
		// Then calls the callback showLocalStream
		peer.addMedia(showLocalStream);
	}

```

Once the localmedia is available the aforementioned code triggers the callback handler `showLocalStream`.

```javascript
	function showLocalStream(stream){

		addStreamListeners(stream);

		// Attach our stream to the video tab above.
		var elm = document.getElementById('myvideo');
		elm.src = window.URL.createObjectURL(stream);

		// Ensure this is muted, we dont want to hear ourselves
		elm.muted = true;

		// Play content, not sure both are required, but hey
		elm.autoplay = true;
		elm.play();

		// Attach the stream to the UI
		elm.onerror = function(event) {
			stream.stop();
		};
	}


```

## localmedia:disconnect

Once localmedia is disconnected localmedia:disconnect event is fired.


```javascript
	peer.on( 'localmedia:disconnect', function(){
		// Set the src='', to remove the last video image from the VideoTag
		document.getElementById('myvideo').src = '';

		// Then, remove the attribute
		// this will now remove any styles we defined on video[src], aka the mirror flip effect.
		document.getElementById('myvideo').removeAttribute('src');
	});
```


## Stream: Mute

Toggle Mute on the local stream
```javascript
	var audioTrack;
	function toggleMute(){

		var stream = peer.localmedia;

		if(!stream){
			// First you have to connect media
			return;
		}

		var tracks = stream.getAudioTracks();
		if(tracks.length){
			audioTrack = tracks[0];
			console.log("Removed track", audioTrack);
			stream.removeTrack(audioTrack);
		}
		else{
			console.log("Restored track", audioTrack);
			stream.addTrack(audioTrack);
		}

		// Show the changed stream
		showLocalStream(stream);
	}
```

## Stream: Picture
Toggle Picture on local media stream

```javascript
	var videoTrack;
	function togglePicture(){

		var stream = peer.localmedia;

		if(!stream){
			// First you have to connect media
			return;
		}

		var tracks = stream.getVideoTracks();
		if(tracks.length){
			videoTrack = tracks[0];
			console.log("Removed track", videoTrack);
			stream.removeTrack(videoTrack);
		}
		else{
			console.log("Restored track", videoTrack);
			stream.addTrack(videoTrack);
		}

		// Show the changed stream
		showLocalStream(stream);
	}
```


## Connect to Threads
The scripts listen to window hash change events, we'll use that for changing which threads we're in
FYI: Threads are like rooms. But a session can be on multiple threads simultaneously. The script below joins users to new threads or changes existing threads to change permissions as to which has media streaming enabled.

```javascript
	var _threadId = null;

	function onhashchange(){

		var threadId = window.location.hash.replace(/^#/,'') || null;

		if( threadId ){

			// Joins the thread, defined by the location.hash
			// Subscribe to thread event messages
			// At the same time it broadcasts a "join" event.
			// Describes the type of media to accept
			peer.thread( threadId, {video:true} );
		}

		if(!threadId && _threadId){

			// Kill the last thread
			peer.thread( _threadId, false);
		}

		// Have we got a new room,
		// Is there an old thread
		else if( _threadId && _threadId !== threadId ){

			// Change the local thread settings
			// Update the thread settings, to share just 'data' (not video)
			// Disconnects all local & remote media
			peer.thread( _threadId, {video:false} );

			// Alternatively: unsubscribe from the thread by removing privileges
			// peer.thread( threadId, null );
		}

		// Reset the room
		_threadId = threadId;

	}

	window.addEventListener('hashchange', onhashchange);

	if(window.location.hash){
		onhashchange();
	}


```

## media:connect

```javascript

	// Media
	// A member of a thread has shared their video stream
	peer.on( 'media:connect', function(e){

		// Create the video tag from the stream
		addVideoElement(e.stream);

	});



	function addVideoElement(stream){

		var id = stream.id,
			vid = document.getElementById(id);

		if( !vid ){
			addStreamListeners(stream);

			vid = document.createElement('video');
			vid.style.background = '-webkit-canvas(loading) no-repeat center center';
			vid.autoplay = true;
			vid.id = stream.id;

			// QuerySelector
			document.querySelector('div.demo').appendChild(vid);

			vid.play();
		}

		var url;

		function setSrc(){
			if(vid.videoWidth<10){
				console.log("video refresh", vid.clientWidth, vid.videoWidth, stream.id, vid);
				if(url){
					window.URL.revokeObjectURL(url);
				}
				url = window.URL.createObjectURL(stream);
				vid.src = url;
				setTimeout(setSrc, 100);
			}
		}

		setSrc();


		return vid;
	}
```

## media:disconnect

```javascript
	// Media Removed
	// A member of a thread has removed their media
	peer.on( 'media:disconnect', function(e){

		// Find this
		var vid = document.getElementById("vid"+e.from);

		if(vid&&vid.parentNode){
			vid.parentNode.removeChild(vid);
		}
	});
```


## Messaging

```javascript

	var msg_box = document.querySelector('pre');
	function messageHandler(obj){
		msg_box.innerHTML += obj.data + " (thread:"+(obj.thread||'')+(obj.from?",from:"+obj.from:'')+")\n";
	}

	// Send messages to the current thread
	var form = document.querySelector('form.msg');

	form.addEventListener('submit', function(e){
		e.preventDefault();
		var data = {
			thread: _threadId,
			data:this.input.value
		};
		messageHandler(data);
		peer.send('message',data);
		this.input.value = '';
	});

	// Listen to peer 'message'
	peer.on('message', messageHandler);

```


## File Sharing

Add a file to a thread

```javascript

	var _files = [];

	function addFile(files){

		var file = files[0];

		// Store a reference to the file
		_files.push( file );


		// Send a message to members in the current thread about the new file
		peer.send({
			// File offer
			type : 'file:offer',

			// Name
			name : file.name,

			// Assign the fileID to the offer
			id : _files.length-1,

			// Add the current thread to the file offer
			thread : _threadId
		});

	}
```

Handle file:offer

```javascript
	peer.on('file:offer', function(e){
		// Add a link to the messages Queue
		var a = document.createElement('a');
		a.innerHTML = e.name;
		a.onclick = function(){
			peer.send({
				type : 'file:request',
				to : e.from,
				id : e.id
			});
		};

		var msg_box = document.getElementById('pre');
		msg_box.appendChild(a);

	});
```


Handle file:request
```javascript
	peer.on('file:request', function(e){

		// Handle this by picking up the file reference
		// And send the file/blob to user
		peer.sendFile( files[e.id], e.from );

	});
```

## Event handlers

Web socket events when a client connects to the server

```javascript

	////////////////////////////////////////
	// Event handlers
	////////////////////////////////////////


	// Session connect
	// This users session has connected
	peer.on( 'socket:connect', function(e){

		// Connected

		/////////////////////
		// Behind the scenes:
		// Publshes any defered messages
		/////////////////////
	});

	// Session Disconnect
	// This users session has disconnected
	peer.on( 'socket:disconnect', function(e){

		// Disconnected

		/////////////////////
		// Behind the scenes:
		// Periodically tries to reestablish a connection
		/////////////////////
	});
```


## Presence
Tag your session and watch for other tags in the presence api.


```javascript

	// Friend connect
	// A frienda session has connected

	peer.on( 'presence:watch', function(e){

		// Connected

		/////////////////////
		// Prerequisites: Having identified this contact via peer.watch( [ID, ...] )
		// Triggered on peer.watch matches an existing session / or thirdparty ID's themselves with peer.tag([ID, ...]);
		/////////////////////
	});


	// Friend Disconnect
	// A friends session has disconnected
	peer.on( 'presence:watch', function(e){

		// Disconnected

		/////////////////////
		// Behind the scenes:
		// Send a request for the friends status 'friend:status'
		/////////////////////
	});

```


```javascript



	// (OPTIONAL)
	// Invoking a call is as simple as creating a new thread and sending an arbitary event to a friend
	// e.g....
	// peer.send( 'invite:connect', { to : friendID, data: ThreadID }, handler );
	// Example handler
	peer.on( 'invite:connect', function(e, callback){
		// Use the threadID from the event to join the thread peer.thread( threadID, permissions )
		// Notify the user of the incoming call return a response which the callers handler understands
		// Probably want to have a timeout, so that if the other party doesn't respond in a minute it returns a cancel.
	});



	// Thread connect
	// A member has joined a thread
	peer.on( 'thread:connect', function(e){

		// A member has joined the thread, peer.thread( thireadID, constraints );
		// e.thread, e.from, e.constraints;

		/////////////////////
		// Behind the scenes:
		// Return a thread:connect event directly to the user, including SDP connection data if none was provided
		// (recommended) send a request for the friends info, 'friend:info', incase the user is unknown
		/////////////////////
	});


	// Thread change
	// A member has changed their permissions
	peer.on( 'thread:change', function(e){

		// A user has changed their permissions to send and recieve video in this thread

		/////////////////////
		// Behind the scenes:
		// PeerConnection has changed, remove/add media streams as appropriate.
		/////////////////////
	});

	// Thread connect
	// A member has left a thread
	peer.on( 'thread:disconnect', function(e){

		// A member has joined the thread
		// e.thread, e.from;

		/////////////////////
		// Behind the scenes:
		// Determine if this session is associated with other open threads.
		// If not then disconnect Peer Connection, otherwise revaluate permissions
		///////////////////////
	});



	//
	// DATACHANNEL
	//
	peer.on('channel:connect', function(e){
		// A datachannel has been siccessfully created with user e.id

	});


	peer.on('channel:message', function(e){
		// A message has been sent over the datachannel from user e.id
		console.log(e);
	});


	// Listen to incoming messages
	// This could be to populate the threads
	peer.on( 'message', function(e){
		/**
		 * The event
		 * {
		 * 		from : Session ID (string),
		 * 		threadID : Thread ID (optional),
		 * 		data : Data | String
		 * }
		 */
	});

	function addStreamListeners(stream){
		stream.onerror = function(e){
			console.error("STREAM ERROR", e);
		};
		stream.onended = function(e){
			console.warn("STREAM ENDED", e);
		};

		stream.getVideoTracks().forEach(addTrackEvent);
		stream.getAudioTracks().forEach(addTrackEvent);

		function addTrackEvent(track){
			track.onerror = function(e){
				console.log("STREAM ERROR", e);
			};
		};
	}


```


Clients connect by passing their PeerConnection credentials together, we can listen to these stream messages like so, however there's no need too.

```javascript

	////////////////////////////
	// BEHIND THE SCENES
	////////////////////////////

	// Having received a thread:connect
	// The pc:offer will be sent by the person with the largest sessionID number to the other
	// peer.send("pc:offer", { data: sdp, to: sessionID, scope : ['video'] }, handler )

	// The recipient will handle the resposne in the followign manner
	peer.on('stream:offer', function(e, handler){
		// Is this a recognized thread?
		// Determine whether to add video to this session by looking at the scopes in both parties threads.
		// Return the pc:answer sdp via the handler
	});

	// The recipient will handle the resposne in the followign manner
	peer.on('stream:answer', function(e, handler){
		// Is this a recognized thread?
		// Determine whether to add video to this session by looking at the scopes in both parties threads.
		// Return the pc:answer sdp via the handler
	});

	// The pc connection triggers 'pc:candidate' events, which trigger the following events
	peer.on('stream:candidate', function(e){
		// Do something
	});

```




## Misc

### Browser support

```javascript
	if(!peer.support.rtc){
		document.querySelector('.demo').innerHTML = "This demo is not supported in your browser, for more information see http://www.webrtc.org/running-the-demos";
	}
```



### Share page link

```javascript
	// Share your current Room with another user
	var link = document.getElementById('chat-room-link');
	link.innerHTML = window.location.href;
	link.href = window.location.href;
```


### "Start camera"
Create the background text on the Video Element

```javascript
	if(document.getCSSCanvasContext){
		var ctx = document.getCSSCanvasContext("2d", "videochat", 100, 38);
		ctx.lineWidth=1;
		ctx.fillStyle="#444444";
		ctx.lineStyle="#000000";
		ctx.font="18px sans-serif";
		ctx.fillText("start camera", 0, 16);
		ctx.fillText("[click]", 30, 35);
	}
```
