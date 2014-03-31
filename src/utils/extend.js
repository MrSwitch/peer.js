//
// Extend
//
define(function(){
	return function extend(a,b){
		var x,r = {};
		if( typeof(a) === 'object' && typeof(b) === 'object' ){
			for(x in a){
				//if(a.hasOwnProperty(x)){
				r[x] = a[x];
				if(x in b){
					r[x] = extend( a[x], b[x]);
				}
				//}
			}
			for(x in b){
				//if(b.hasOwnProperty(x)){
				if(!(x in a)){
					r[x] = b[x];
				}
				//}
			}
		}
		else{
			r = b;
		}
		return r;
	};
});