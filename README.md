
# PeerJS - WebRTC video chat



PeerJS is a service which makes it easier to build a chat room using the upcoming present [WebRTC's PeerConnection API](http://www.w3.org/TR/webrtc/). The PeerConnection API proposes to be able to send data, video etc from one user-agent to another without the need for it going through a server. The demo here relies on a simple nodejs relay server [Peer-Server](http://github.com/MrSwitch/peer-server.js) to marry two user-agents.








Share chatroom link []()

## Demo Code
The above demo takes just a few steps to implement. Firstly embed the Peer.JS script

	window.PEER_SERVER_HOST = "https://peer-server.herokuapp.com";


	<script class="pre" src="http://localhost:5000/peer.js"></script>

Next, create a unique id with Math.random() for the chat room, you could hard code this if you like, but anyway, i'm generating it like so...


	window.location.hash = (window.location.hash || parseInt(Math.random()*1e4,10).toString(16));


connect with video. Call the library Peer and invoke a new session. Append the video tag (defined by the id 'myvideo'). Connect to the "room" we spoke about earlier. Then listen for new media steams from other people in the same chat room.


	var session = Peer.initSession().addMedia('myvideo').connect(window.location.hash).on('media', function(e){
		document.querySelector('div.demo').appendChild(e.video);
	});


send data Send data to the room. createDataChannel has been proposed but is not implemented. The relay server works pretty well though

	<script class="pre">
	var form = document.querySelector('form.msg');
	session.on('message', function(event){
		form.textarea.value = event.data+"\n"+form.textarea.value;
	});
	form.addEventListener('submit', function(e){
		e.preventDefault();
		form.textarea.value = "me:" + this.input.value+"\n"+form.textarea.value;
		session.send('message', {data:this.input.value});
		this.input.value = '';
	});
	</script>

Lastly, because chatting to yourself can bring about men in white coats, i've added a link to share the page with friends (to test you can just open in a new tab).

	<script class="pre">
	var link = document.getElementById('chat-room-link');
	link.innerHTML = window.location.href;
	link.href = window.location.href;
	</script>

[Optionally]. If the user-agent doesn't support WebRTC then lets so something

	<script class="pre">
	if(!Peer.supported){
		document.querySelector('.demo').innerHTML = "This demo is not supported in your browser, for more information see http://www.webrtc.org/running-the-demos";
	}
	</script>
