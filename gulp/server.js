'use strict';

const path = require('path');
const gulp = require('gulp');

const nodemon = require('gulp-nodemon');
const browserSync = require('browser-sync');

gulp.task('browser-sync', ['nodemon'], function () {
  browserSync.init({
    proxy: 'http://localhost:3000',
    files: [{
      match: ['dist/**/*.*']
    }],
    browser: 'google chrome',
    port: 3001
  });
});

gulp.task('nodemon', function (callback) {
  let started = false;

  return nodemon({
    script: 'server.js',
  }).on('start', function () {
    if (!started) {
      callback();
      started = true;
    }
  });

});

