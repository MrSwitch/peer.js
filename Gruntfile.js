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
          mainConfigFile: './src/require-config.js',
          name: 'peer',
          out: 'dist/thread.js',
          wrap: {
              start: "(function(window,document,navigator){",
              end: "})(window,document,navigator);"
          },
          //A function that will be called for every write to an optimized bundle
          //of modules. This allows transforms of the content before serialization.
          onBuildWrite: function (moduleName, path, contents) {
              //Always return a value.
              //This is just a contrived example.
              return contents.replace(/console\.log\((.*?)\)/g, '');
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
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint']
    },

    // Shunt files around
    shunt : {
      // Shunt the documents of our project
      docs : {
        "./index.html" : "src/index.html",
        "./README.md" : "src/index.html"
      },

      // Shunt the source files into a distribution directory
      src : {
        // Create files newFile=>Packages
        "./bin/document.min.css" : "../_packages/document.css",
        "./bin/document.min.js" : "../_packages/document.js",
        "./bin/index.html" : "src/index.html",
        "./bin/peer.js" : "src/peer.js",
        "./bin/app.js" : "src/app.js",

        // Extend options for this task
        options : {
          // This is the root directory on the local filesystem where root referenced scripts can be found.
          // For instance, <script src="/vendor/jquery.js"></script> existed, and was pointing to a file outside this project*
          // (*you might do this if you have a lot of projects)
          // Then this is the full path to the web root.
          root_dir : "D:/Projects/",

          overrideRoot : 'http://adodson.com/',
        }
      },

      options : {
        replace : {
          "http://localhost:5000/peer.js" : "https://peer-server.herokuapp.com/peer.min.js"
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('shunt');

  grunt.registerTask('test', ['jshint', 'qunit']);
  grunt.registerTask('default', ['jshint']);

};