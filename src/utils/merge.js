//
// Extend
//
define([
	'./extend'
],function(extend){
	return function(r){
		var x, a = Array.prototype.splice.call(arguments,0);
		a.unshift({});
		return extend.apply(null, a);
	};
});