'use strict';

var path = require('path');
var gulp = require('gulp');
var conf = require('./conf');

var nodemon = require('gulp-nodemon');
var browserSync = require('browser-sync');

gulp.task('nodemon', cb => {
  let started = false;
  return nodemon({
    script: 'server.js'
  }).on('start', () => {
    if (!started) {
      cb();
      started = true;
    }
  });
});


gulp.task('browser-sync', ['nodemon'], () => {
  browserSync.init(null, {
    proxy: 'http://localhost:3000',
    files: ['dist/**/*.*'],
    port: 5000
  });
});


function isOnlyChange(event) {
  return event.type === 'changed';
}


gulp.task('watch', ['browser-sync', 'inject'], function () {


  gulp.watch([path.join(conf.paths.src, '**/*.html'), 'bower.json'], ['inject-reload']);

  gulp.watch([
    path.join(conf.paths.src, '**/*.css'),
    path.join(conf.paths.src, '**/*.scss')
  ], function (event) {
    if (isOnlyChange(event)) {
      gulp.start('styles-reload');
    } else {
      gulp.start('inject-reload');
    }
  });

  gulp.watch(path.join(conf.paths.src, '**/*.js'), function (event) {
    if (isOnlyChange(event)) {
      gulp.start('scripts-reload');
    } else {
      gulp.start('inject-reload');
    }
  });

  gulp.watch(path.join(conf.paths.src, '**/*.html'), function (event) {
    browserSync.reload(event.path);
  });
});


