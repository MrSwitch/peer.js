define(function(){
	
	// Fix FF issue
	return window.RTCSessionDescription || window.mozRTCSessionDescription;
});