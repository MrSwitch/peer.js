//
// Diff
// Finds the difference between two objects
define(function(){

	return function(a,b){

		var r = {};

		// What is different in b that is not in a
		// Return the new value which has changed, aka b
		for(var x in b){
			if( b[x] !== a[x] ){
				r[x] = b[x];
			}
		}
		return r;
	};

});