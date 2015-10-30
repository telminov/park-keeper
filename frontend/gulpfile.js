var gulp = require('gulp');
var gutil = require('gulp-util');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var coffee = require('gulp-coffee');
var angularTemplates = require('gulp-angular-templates');


var paths = {
    scripts: {
        lib: [
            'bower_components/jquery/dist/jquery.min.js',
            'bower_components/moment/min/moment.min.js',
            'bower_components/moment/min/locales.min.js',
            'bower_components/bootstrap/dist/js/bootstrap.min.js',
            'bower_components/angular/angular.min.js',
            'bower_components/angular-resource/angular-resource.min.js',
            'bower_components/angular-route/angular-route.js',
            'bower_components/angular-sanitize/angular-sanitize.min.js',
            'bower_components/angular-animate/angular-animate.min.js',
            'bower_components/angular-cookies/angular-cookies.min.js',
            'bower_components/angular-filter/dist/angular-filter.js',
            'bower_components/angular-bootstrap/ui-bootstrap.min.js',
            'bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
            'bower_components/sw-angular-utils/sw-angular-utils.js',
            'bower_components/sw-angular-websocket/sw-angular-websocket.js',
            'bower_components/sw-angular-auth/sw-angular-auth.js'
        ],
        app: './src/**/*.coffee'
    },
    html: './src/app/controllers/**/*.html'
};


gulp.task('html', function () {
    return gulp.src(paths.html)
        .pipe(angularTemplates({basePath: 'controllers/', module: 'parkKeeper'}))
        .pipe(concat('templates.js'))
        .pipe(gulp.dest('./dist/'));
});

gulp.task('js', function () {
    gulp.src(paths.scripts.app)
        .pipe(sourcemaps.init())
        .pipe(coffee().on('error', gutil.log))
        .pipe(concat('app.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist/'));
});

gulp.task('lib', function () {
    gulp.src(paths.scripts.lib)
        .pipe(concat('lib.js'))
        .pipe(gulp.dest('./dist/'));
});

gulp.task('watch', ['js', 'html', 'lib'], function () {
    gulp.watch(paths.scripts.app, ['js']);
    gulp.watch(paths.html, ['html']);
});
