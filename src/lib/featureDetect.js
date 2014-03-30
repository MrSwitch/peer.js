define(['utils/PeerConnection'],function(PeerConnection){
	var pc, channel;
	try{
		// raises exception if createDataChannel is not supported
		pc = new PeerConnection( {"iceServers": [{"url": "stun:localhost"}] });
		channel = pc.createDataChannel('supportCheck', {reliable: false});
		channel.close();
		pc.close();
	} catch(e) {}

	return {
		rtc : !!pc,
		datachannel : !!channel
	};
});