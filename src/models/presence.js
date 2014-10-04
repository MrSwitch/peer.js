//
// Provide a mechanism for monitoring peer presence
//

define(function(){


	return function(){

		/////////////////////////////////////
		// TAG / WATCH LIST
		//
		this.tag = function(data){

			if(!(data instanceof Array)){
				data = [data];
			}

			this.send('presence:tag', {data:data} );

			return this;
		};


		//
		// Add and watch personal identifications
		//
		this.watch = function(data){

			if(!(data instanceof Array)){
				data = [data];
			}

			this.send('presence:watch', {to:data} );

			return this;
		};
	};
});