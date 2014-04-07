//
// getScript
//
define(function(){
	return function(url, callback){
		// Load socketIO
		var script = document.createElement('script');
		script.src = url;
		script.onreadystatechange= function () {
			if (this.readyState == 'complete') {
				callback();
			}
		};
		script.onload = callback;

		var ref = document.getElementsByTagName('script')[0];
		var parent = ref.parentNode;
		if(parent){
			parent.insertBefore(script,ref);
		}
	};
});