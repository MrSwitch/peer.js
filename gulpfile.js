'use strict';

let gulp = require('gulp');
let browserify = require('browserify');
let babelify= require('babelify');
let util = require('gulp-util');
let buffer = require('vinyl-buffer');
let source = require('vinyl-source-stream');
let uglify = require('gulp-uglify');
let sourcemaps = require('gulp-sourcemaps');
let args   = require('yargs').argv;
let gulpif = require('gulp-if');

gulp.task('build', () => {
	browserify('./src/main.js', { debug: true })
	.transform(babelify)
	.bundle()
	.on('error', util.log.bind(util, 'Browserify Error'))
	.pipe(source('./peer.js'))
	.pipe(buffer())
	.pipe(sourcemaps.init({loadMaps: true}))
	.pipe(gulpif(!args.debug, uglify({ mangle: false })))
	.pipe(sourcemaps.write('./'))
	.pipe(gulp.dest('./dist/'))
	.on('end', console.log.bind(console, 'BUILT'));
});

gulp.task('default', ['build']);

gulp.task('watch', () => {
   gulp.watch('src/**/*.js', ['build']);
});
