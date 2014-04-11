//
// Extend
//
define(function(){
	return function extend(r, replace){
		var x, a = Array.prototype.splice.call(arguments,1);
		for(var i=0;i<a.length;i++){
			replace = a[i];
			if( typeof(r) === 'object' && typeof(replace) === 'object' ){
				for(x in replace){
					//if(b.hasOwnProperty(x)){
					r[x] = extend(r[x], replace[x]);
					//}
				}
			}
			else{
				r = replace;
			}
		}
		return r;
	};
});