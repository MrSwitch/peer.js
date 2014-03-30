define(function(){
	return function isEqual(a,b){
		var x;
		if( typeof(a) !== typeof(b) ){
			return false;
		}
		else if( typeof(a) === 'object' ){
			for(x in a){
				if( !isEqual( a[x], b[x] ) ){
					return false;
				}
			}
			for(x in b){
				if( !( x in a ) ){
					return false;
				}
			}
		}
		return a === b;
	};
});