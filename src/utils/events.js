//
// Events
//
define(function(){

	var separator = /[\s\,]+/;
	var WILDCHAR = '*';

	// EVENTS
	// Extend the function we do have.
	function Events(){
		this.events = {};
		this.callback = [];
	}

	// Return
	// @param event_name string
	// @param callback function
	Events.prototype.on = function(name, callback){

		// If there is no name
		if(name===true){
			callback.call(this);
		}
		else if(typeof(name)==='object'){
			for(var x in name){
				this.on(x, name[x]);
			}
		}
		else if ( name.match( separator ) ){
			for(var i=0,a=name.split( separator );i<a.length;i++){
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
	Events.prototype.one = function(name, callback){
		var self = this;
		this.on(name, function once(){ self.off(name,once); callback.apply(self, arguments);} );
	};


	// Trigger Events defined on the publisher widget
	Events.prototype.emit = function(name,evt,callback){
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

		console.log('Triggered: ' + name, JSON.stringify(evt));
		var a = name.split( separator );
		a.push( WILDCHAR );

		for(var i=0;i<a.length;i++){
			var _name = a[i];
			var _events = this.events[_name];
			if(_events){
				for(var j=0; j<_events.length; j++){
					var _event = _events[j];
					if(_event){
						var args = [evt, callback];
						if( _name === WILDCHAR ){
							args.unshift(name);
						}
						_event.apply(self,args);
					}
				}
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
	Events.prototype.off = function(event_names, callback){
		var a = event_names.split(separator);
		for(var j=0;j<a.length;j++){
			var name = event_names[i];
			if(this.events[name]){
				for( var i=0; i< this.events[name].length; i++){
					if(this.events[name][i] === callback){
						this.events[name][i] = null;
					}
				}
			}
		}
	};


	return Events;

});