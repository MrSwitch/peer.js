// App.build.js
// Put this in the build package of Sublime Text 2
/*
{
	"cmd": ["node", "${file_path:${folder}}/app.build.js", "$file_path"],
	"working_dir" : "${file_path:${folder}}"
}
*/
var buildDist = require("../../_packages/buildDist.js");

//
// Build files
// Moves files into the bin directory, having
// Minified CSS and Javascript files
// Changed references to files in other projects to their absolute URL's
buildDist({
	"../index.html" : "./index.html",
	"../README.md" : "./index.html"
});

buildDist({
	// Create files newFile=>Packages
	"../bin/document.min.css" : "../../_packages/document.css",
	"../bin/document.min.js" : "../../_packages/document.js",
	"../bin/index.html" : "./index.html",

	"../bin/peer.js" : "peer.js",

	"../bin/app.js" : "./app.js",
	"../bin/peer-server.js" : "./peer-server.js"
}, {
	// REPLACE STRINGS
	"/_packages/document.css" : "./document.min.css",
	"/_packages/document.js" : "./document.min.js"
});