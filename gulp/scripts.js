'use strict';

const path = require('path');
const gulp = require('gulp');
const conf = require('./conf');

const browserSync = require('browser-sync');

const $ = require('gulp-load-plugins')();

function buildScripts() {
  return gulp.src(path.join(conf.paths.src, '/app/**/*.js'))
    .pipe($.eslint())
    .pipe($.eslint.format())
    .pipe($.size());
}

gulp.task('scripts-reload', function () {
  return buildScripts()
    .pipe(browserSync.stream());
});

gulp.task('scripts', function () {
  return buildScripts();
});
