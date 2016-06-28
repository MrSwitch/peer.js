module.exports = function(grunt) {

	grunt.initConfig({
		// Shunt files around
		shunt : {
			// Shunt the documents of our project
			docs : {
				"./README.md" : "src/index.html",
				"./index.html" : "src/index.html"
			}
		}
	});

	grunt.loadNpmTasks('shunt');
};
