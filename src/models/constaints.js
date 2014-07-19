//
// Constraints
// Manages the streams constraints based upon the threads which both parties are in.
// Extends the peer object and listens for thread change events
// Triggers stream contraints events
//

define(function(){

	// Manage a thread dependency tree


	// Extend the peer object

	return function(){

		// Listen to thread changes
		this.on('thread:change, thread:connect, thread:disconnect', function(){


			// Who is sending this information?
			
			var from = e.from;


			// Is this is a local event?

			if( !from ){

				// The local user has potentially changed their constraints, so what has changed?
			
				// First look at potential

			}

		});


	};

});