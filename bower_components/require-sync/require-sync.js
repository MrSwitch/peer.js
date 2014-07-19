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
	// Extend
	//
	function extend(a,b){
		for(var x in b){
			a[x] = b[x];
		}
	}

	//
	// Each
	//
	function each(arr,handler){
		if(!arr){
			return;
		}
		for(var i=0;i<arr.length;i++){
			handler(arr[i],i);
		}
	}

	//
	// Real path
	//
	function realpath(path, referer){
		if(referer){
			path = ( referer.replace(/[^\/]+$/,'') + path ).replace(/(^|\/)\.\//,'$1');
			var regParent = /(^|\/)[a-z0-9][^\/]*\/\.\.\//ig;
			while( regParent.test(path) ){
				path = path.replace( regParent, '$1');
			}
		}
		return path;
	}

	//
	// Require modules
	// 
	var REQUIRE_MODULE = 'data-requiremodule';

	//
	// Optional overrides
	//
	var options = {
		baseUrl : ''
	};

	//
	// GetScript
	//
	function getScript(script){
		if(!script){
			return;
		}
		var path = script;
		if( options.paths && script in options.paths ){
			path = options.paths[script];
		}
		document.write('<script src="'+ options.baseUrl + path+'.js" '+ REQUIRE_MODULE +'="'+script+'"></script><script '+ REQUIRE_MODULE +'="'+script+'">define("'+script+'");</script>');
	}

	//
	// Get the current script tag
	//
	function scriptTag(){
		var scripts = document.getElementsByTagName('script');
		return scripts[scripts.length-1];
	}

	var modules = {},
		queue = [], 
		unknown_counter = 0;

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
		each(p.deps, function(item, i){

			// Make item name relative
			p.deps[i] = item = realpath( item, name );

			// 
			if( !(item in modules) ){

				// Create a placeholder for this module
				modules[item] = undefined;

				// Add the dependent to the queue
				// in many browsers we could just call getScript,
				// however IE9&8 doesn't let us write multiple script tags without losing ability to find the currentScript being executed
				queue.push(item);
			}
		});

		// Define this module
		if( !name ){
			name = 'main' + unknown_counter++;
		}

		// be careful not to call the shim if the item was defined

		if( modules[name] === undefined ){
			// Assign
			modules[name] = p;

			// Try ro resolve pending ops
			resolve();

			// Get the next Script in Queue
			getScript(queue.shift());
		}
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
			// Or even still loading
			if( !module || "resolved" in module ){
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
			module.resolved = module.callback ? module.callback.apply(null, _apply) : undefined;

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
		var baseReg = /^.*\//;

		// Define the baseUrl based upon the path
		if( script.match( baseReg ) ){
			options.baseUrl = script.match(baseReg)[0];
		}

		// Initiate
		getScript(script.replace(baseReg, ''));
	}

	//
	// Config
	//
	window.require.config = function(_options){
		extend(options, _options);
	};

})(this);