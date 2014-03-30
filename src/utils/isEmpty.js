define(function(){
	return function isEmpty(obj){
		for(var x in obj){
			if(obj[x]){
				return false;
			}
		}
		return true;
	};
});