(function(window){

	//
	// Args
	//
	function args(name,deps,callback){
		if(typeof(name) !== 'string'){
			callback = deps;
			deps = name;
			name = null;
		}
		if(!(deps instanceof Array)){
			callback = deps;
			deps = [];
		}
		return {
			name : name,
			deps : deps,
			callback : callback
		};
	}

	//
	// Require modules
	// 
	var REQUIRE_MODULE = 'data-requiremodule';

	//
	// Optional overrides
	//
	var options = {};

	//
	// GetScript
	//
	function getScript(script){
		var path = script;
		if( options && options.paths && script in options.paths ){
			path = options.paths[script];
		}
		document.write('<script src="'+path+'.js" '+ REQUIRE_MODULE +'="'+script+'"></script>');
	}

	//
	// Get the current script tag
	//
	function scriptTag(){
		var scripts = document.getElementsByTagName('script');
		return scripts[scripts.length-1];
	}

	var modules = {};

	//
	// Require
	// 
	window.require = window.define = function(name, deps, callback){
		// sanitize
		var p = args.apply(null,arguments);

		// Read the script tag this came in on.
		var node = scriptTag();
		name = node.getAttribute(REQUIRE_MODULE);

		// Load its dependencies
		p.deps.forEach(function(item){
			if( !(item in modules) ){
				getScript(item);
			}
		});

		// Define this module
		modules[name || 'main'] = p;

		// Try ro resolve pending ops
		resolve();

	};


	//
	// Label this, used for sniffing the define method
	// See https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property-
	window.define.amd = {};


	//
	// Resolve
	// Find files and see if their dependencies have been resolved
	//
	function resolve(){

		// Loop through all modules registered
		for(var x in modules){
			// Modules
			var module = modules[x];

			// Has this modules already been resolved?
			if( "resolved" in module ){
				// Do nothing
				continue;
			}

			// Is it ready to be resolved?
			var dependencies = module.deps,
				dependency,
				_apply = [],
				resolved = true;

			for( var i=0; i<dependencies.length; i++ ){
				// Get the dependency
				dependency = modules[dependencies[i]];

				// Has it been resolved
				if( !dependency || !( "resolved" in dependency ) ){
					resolved = false;
				}
				else{
					_apply.push( dependency.resolved );
				}
			}

			// Awaitind fullfillment
			if(!resolved){
				continue;
			}

			// Resolved
			module.resolved = module.callback.apply(null, _apply);

			// Rerun the loop
			resolve();

			// Break this one here.
			break;
		}
	}


	//
	// Has this script been loaded with a Data Attribute?
	//
	var script = scriptTag().getAttribute('data-main');
	if(script){
		getScript(script);
	}


	//
	// Config
	//
	window.require.config = function(_options){
		options = _options;
	};

})(this);