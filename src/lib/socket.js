//
// Web Socket
// Socket creates a send/receive protocol with the server
// Currently this abstracts Socket.IO
//
define(['utils/events', 'utils/getScript'], function(Events, getScript){

	//
	var socket = null;

	var self = Object.create(null);

	Events.call(self);

	var callbacks = [];

	self.connect = function(ws, callback){

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
					if("callback" in data){
						o.to = data.from;
						o.callback_response = data.callback;
						socket.send(JSON.stringify(o));
					}
				});
			});
		};

		// Load SocketIO if it doesn't exist
		if(typeof(io)==='undefined'){
			getScript((ws||'') + "/socket.io/socket.io.js", onload);
		}
	};

	//
	// Send messages
	//
	self.send = function(name, data, callback){

		var callback_id;

		// Add callback
		if(callback){
			// Count
			callback_id = callbacks.length;
			callbacks.push(callback);
		}

		self.one(!!this.id||'socket:connect', function(){
			if( name ){
				socket.emit(name, data, callback_id);
			}
			else{
				socket.send(JSON.stringify(data));
			}
		});
	};

	//
	// Disconnect
	self.disconnect = function(){
		if(socket){
			socket.disconnect();
		}
	};

	self.one('socket:connect', function(e){
		self.id = e.to;
	});


	return self;
});