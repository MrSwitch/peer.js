//
// Web Socket
// Socket creates a send/receive protocol with the server
// Currently this abstracts Socket.IO
//
define([
	'../utils/getScript'
], function(
	getScript
){

	var callbacks = [];


	return function(){

		var self = this;

		//
		// Initiate the socket connection
		//
		this.init = function(ws, callback){


			//
			var connected;

			// What happens on connect
			var onload = function(){

				if(connected){
					return;
				}
				connected = false;

				// Connect to the socket
				socket = io.connect( ws );

				console.log(socket.socket.sessionid);

				// Define an message handling
				socket.on('message', function(data){

					// Deserialize
					data = JSON.parse(data);

					// Look for callbacks
					if("callback_response" in data){
						var i = data.callback_response;
						delete data.callback_response;
						callbacks[i](data);
						return;
					}

					self.emit.call(self, data.type, data, function(o){
						// if callback was defined, lets send it back
						if("callback_id" in data){
							o.to = data.from;
							o.callback_response = data.callback_id;
							socket.send(JSON.stringify(o));
						}
					});
				});
			};

			// Load SocketIO if it doesn't exist
			if(typeof(io)==='undefined'){
				getScript((ws||'') + "/socket.io/socket.io.js", onload);
			}


			// Loaded
			if(callback){
				this.one('socket:connect', callback);
			}


			return this;
		};


		// Disconnect

		this.disconnect = function(){
			if(socket){
				socket.disconnect();
			}
		};


		//
		// Send information to the socket
		//
		this.send = function(name, data, callback){

			//
			if (typeof(name) === 'object'){
				callback = data;
				data = name;
				name = data.type;
			}

			var callback_id;


			// Add callback
			if(callback){
				// Count
				data.callback_id = callbacks.length;
				callbacks.push(callback);
			}

			var action = function(){
				if( name ){
					socket.emit(name, data);
				}
				else{
					socket.send(JSON.stringify(data));
				}
			};

			if(this.id){
				action();
			}
			else{
				self.one('socket:connect', action);
			}

			return this;
		};



		self.one('socket:connect', function(e){
			self.id = e.id;
		});


	};
});