define(function(){
	// Shim up the getUserMedia API
	if(!navigator.getUserMedia){
		// I'd like to wrap this to a custom variable but it has to be on the navigator object to work
		navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;
	}

	return function getUserMedia(constraints, success, failure){
		try{
			navigator.getUserMedia(constraints, success, failure);
		}
		catch(e){
			try{
				// provide a string of constraints
				navigator.getUserMedia( Object.keys(constraints).join(','), success, failure);
			}
			catch(_e){
				failure();
			}
		}
	};
});