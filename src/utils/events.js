//
// Events
//
define(function(){

	// EVENTS
	// Extend the function we do have.
	return function Events(){

		this.events = {};
		this.callback = [];

		// Return
		this.on = function(name, callback){

			// If there is no name
			if(name===true){
				callback.call(this);
			}
			else if(typeof(name)==='object'){
				for(var x in name){
					this.on(x, name[x]);
				}
			}
			else if (name.indexOf(',')>-1){
				for(var i=0,a=name.split(',');i<a.length;i++){
					this.on(a[i],callback);
				}
			}
			else {
				console.log('Listening: ' + name);

				if(callback){
					// Set the listeners if its undefined
					if(!this.events[name]){
						this.events[name] = [];
					}

					// Append the new callback to the listeners
					this.events[name].push(callback);
				}
			}

			return this;
		};

		// One
		// One is the same as On, but events are only fired once and must be reestablished afterwards
		this.one = function(name, callback){
			var self = this;
			this.on(name, function once(){ self.off(name,once); callback.apply(self, arguments);} );
		};

		// Trigger Events defined on the publisher widget
		this.emit = function(name,evt,callback){
			var self = this;

			if(!name){
				throw name;
			}
			var preventDefault;
			// define prevent default
			evt = evt || {};
			evt.preventDefault = function(){
				preventDefault = true;
			};

			console.log('Triggered: ' + name);
			var a = name.split(/[\s\,]+/);
			a.push('*');

			for(var i=0;i<a.length;i++){
				var _name = a[i];
				if(this.events[_name]){
					this.events[_name].forEach(function(o,i){
						if(o){
							o.call(self,evt,callback);
						}
					});
				}
			}
			
			// Defaults
			if(!preventDefault && "default:"+name in this.events){
				console.log('Triggered: default:' + name);
				this.events["default:"+name].forEach(function(o,i){
					if(o){
						o.call(self,evt,callback);
					}
				});
			}

			return this;
		};

		// Remove a callback
		this.off = function(name, callback){
			if(this.events[name]){
				for( var i=0; i< this.events[name].length; i++){
					if(this.events[name][i] === callback){
						this.events[name][i] = null;
					}
				}
			}
		};
	};

});