//
// localMedia
//
define([
	'../utils/getUserMedia'
], function(
	getUserMedia
){


	return function(){

		//
		// LocalMedia
		// 
		this.localmedia = null;

		//
		// AddMedia
		//
		this.addMedia = function(successHandler, failHandler){

			var self = this;


			// Create a success callback
			// Fired when the users camera is attached
			var _success = function(stream){

				// Attach stream
				self.localmedia = stream;

				// listen for change events on this stream
				stream.onended = function(){

					// Detect the change
					if( !self.localmedia || self.localmedia === stream ){
						self.emit('localmedia:disconnect', stream);
						self.localmedia = null;
					}
				};

				if(successHandler){
					successHandler(stream);
				}

				// Vid onload doesn't seem to fire
				self.emit('localmedia:connect',stream);

			};

			//
			// Has the callback been replaced with a stream
			//
			if(successHandler instanceof EventTarget){

				// User aded a media stream
				_success(successHandler);
				return this;
			}

			// Do we already have an open stream?
			else if(this.localmedia){
				if(successHandler){
					successHandler(this.localmedia);
				}
				return this;
			}


			// Call it?
			getUserMedia({audio:true,video:true}, _success, function(e){
				// Trigger a failure
				self.emit('localmedia:failed', e);
				failHandler();
			});


			return this;
		};
	};
});