//
// File
// Make available a link to stream file/blob artifacts
//

define([

], function(){


	return function(){

		var self = this;


		var chunkLength = 1000;

		// Extend the peer object
		// Sends the current file to another peer

		this.sendFile = function(file, to){

			var reader = new window.FileReader();

			reader.onload = onReadAsDataURL;

			reader.readAsDataURL(file);

			var data = {
				to : to,
				type : 'file:progress'
			};

			function onReadAsDataURL(event, text, index){

				if( event ){
					text = event.target.result;
				}

				data.index = +index||0;

				if (text.length > chunkLength) {
					data.message = text.slice(0, chunkLength); // getting chunk using predefined chunk length
				} else {
					data.message = text;
					data.last = true;
				}

				self.send(data); // use JSON.stringify for chrome!

				var remainingDataURL = text.slice(data.message.length);

				if (remainingDataURL.length){
					setTimeout(function () {
						onReadAsDataURL(null, remainingDataURL); // continue transmitting
					}, 500);
				}
			}
		};

		var files = {};

		//
		// Listen to incoming files
		//
		this.on('file:progress', function(data){

			// Stick the pieces of the file back together
			files[data.id] = files[data.id] || [];
			files[data.id][data.index] = data.message;

		});

	};

});