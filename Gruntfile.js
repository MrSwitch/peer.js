module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		requirejs: {
			js: {
				options: {
					findNestedDependencies: true,
					baseUrl: './src/',
					preserveLicenseComments: false,
					optimize: 'uglify2',
					name: 'peer',
					out: 'dist/peer.js',
					wrap: {
							start: "(function(window,document,navigator){",
							end: "})(window,document,navigator);"
					},
					//A function that will be called for every write to an optimized bundle
					//of modules. This allows transforms of the content before serialization.
					onBuildWrite: function (moduleName, path, contents) {
							//Always return a value.
							//This is just a contrived example.
							return contents.replace(/console\.log\((.*?)\);/g, '');
					},
					onModuleBundleComplete: function (data) {
						var fs = require('fs'),
							amdclean = require('amdclean'),
							outputFile = data.path;
						fs.writeFileSync(outputFile, amdclean.clean({
							'filePath': outputFile
						}));
					}
				}
			}
		},
		jshint: {
			files: ['Gruntfile.js', 'src/**/*.js'],//, 'test/**/*.js'],
			options: {
				// options here to override JSHint defaults
				globals: {
					console: true,
					module: true,
					document: true
				}
			}
		},
		mochaTest: {
			test: {
				options: {
					reporter: 'spec',
					globals : {
						expect : require("expect")
					}
				},
				src: ['tests/**/*.js']
			}
		},

		mocha_phantomjs: {
			options: {
				// 'reporter': 'xunit',
				// 'output': 'test/results/mocha.xml'
			},
			all: ['tests/specs/index.html']
		},

		watch: {
			files: ['<%= jshint.files %>'],
			tasks: ['jshint']
		},

		// Shunt files around
		shunt : {
			// Shunt the documents of our project
			docs : {
				"./README.md" : "src/index.html",
				"./index.html" : "src/index.html",
				options : {
					replace : {
						"./peer.js" : "https://peers.herokuapp.com/peer.min.js"
					}
				}
			},

			// Shunt the source files into a distribution directory
			src : {
				// Create files newFile=>Packages
				"./bin/adorn.min.css" : "../adorn/adorn.css",
				"./bin/adorn.min.js" : "../adorn/adorn.js",
				"./bin/index.html" : "./src/index.html",
				"./bin/peer.js" : "./dist/peer.js",

				// Extend options for this task
				options : {
					// This is the root directory on the local filesystem where root referenced scripts can be found.
					// For instance, <script src="/vendor/jquery.js"></script> existed, and was pointing to a file outside this project*
					// (*you might do this if you have a lot of projects)
					// Then this is the full path to the web root.
					replace : {
						"/adorn/adorn." : "/adorn.min."
					}
				}
			},
		},

	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-mocha-phantomjs');

	grunt.loadNpmTasks('grunt-contrib-requirejs');
	grunt.loadNpmTasks('shunt');

	grunt.registerTask('test', ['jshint']);
	grunt.registerTask('build', ['test','requirejs', 'shunt']);
	grunt.registerTask('default', ['jshint','requirejs']);

};