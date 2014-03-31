// App.build.js
// Put this in the build package of Sublime Text 2
/*
{
	"cmd": ["node", "${file_path:${folder}}/app.build.js", "$file_path"],
	"working_dir" : "${file_path:${folder}}"
}
*/
var shunt = require("shunt");

//
// Build files
// Moves files into the bin directory, having
// Minified CSS and Javascript files
// Changed references to files in other projects to their absolute URL's
shunt({
	"./index.html" : "src/index.html",
	"./README.md" : "src/index.html"
},{

	// Overrides the root of script and link tags in HTML,
	// e.g. src="/_packages/document.js" becomes "http://adodson.com/_packages/document.js"

	//
	replace :{
		"http://localhost:5000/peer.js" : "https://peer-server.herokuapp.com/peer.min.js"
	}
});

shunt({
	// Create files newFile=>Packages
	"./bin/document.min.css" : "../../_packages/document.css",
	"./bin/document.min.js" : "../../_packages/document.js",
	"./bin/index.html" : "src/index.html",

	"./bin/peer.js" : "src/peer.js",

	"./bin/app.js" : "src/app.js",
	"./bin/peer-server.js" : "src/peer-server.js"
}, {
	// This is the root directory on the local filesystem where root referenced scripts can be found.
	// For instance, <script src="/vendor/jquery.js"></script> existed, and was pointing to a file outside this project*
	// (*you might do this if you have a lot of projects)
	// Then this is the full path to the web root.
	root_dir : "D:/Projects/",

	overrideRoot : 'http://adodson.com/',

	replace : {
		"http://localhost:5000/peer.js" : "https://peer-server.herokuapp.com/peer.min.js"
	}
});
