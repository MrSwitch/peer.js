define(function(){

	// Shim up the getUserMedia API
	// Wrap this to a custom variable but bind it on the navigator object to work
	var _getUserMedia = (
		navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia ||
		navigator.oGetUserMedia
	).bind(navigator);

	return function getUserMedia(constraints, success, failure){
		try{
			_getUserMedia(constraints, success, failure);
		}
		catch(e){
			try{
				// provide a string of constraints
				_getUserMedia( Object.keys(constraints).join(','), success, failure);
			}
			catch(_e){
				failure();
			}
		}
	};
});