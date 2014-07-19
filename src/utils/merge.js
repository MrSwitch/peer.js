//
// Extend
//
define([
	'utils/extend'
],function(extend){
	return function(r){
		var x, a = Array.prototype.splice.call(arguments,1);
		a.unshift({});
		return extend.apply(null, a);
	};
});