//
// Extend
//
define(function(){
	return function extend(r, replace){
		var x, a = Array.prototype.splice.call(arguments,1);
		for(var i=0;i<a.length;i++){
			replace = a[i];
			if( typeof(replace) !== 'object' ){
				continue;
			}
			for(x in replace){
				//if(a.hasOwnProperty(x)){
				r[x] = replace[x];
			}
		}
		return r;
	};
});