let plug = {}

plug.build = () => {
    plug.flags = {}
    plug.gulpPlugs = plugs = {}
    plug.registeredTasks = {}
    plug.yamlFile = 'gulp.yml'

    const argv      = plugs.argv      = require('minimist')(process.argv.slice(2))
    const chalk     = plugs.chalk     = require('chalk')
    const del       = plugs.del       = require('del')
    const fs        = plugs.fs        = require('fs')
    const gulp      = plugs.gulp      = require('gulp')
    const gulpif    = plugs.gulpif    = require('gulp-if')
    const gutil     = plugs.gutil     = require('gulp-util')
    const g         = plugs.gplug     = require('gulp-load-plugins')()
    const notify    = plugs.notify    = require('gulp-notify')
    const path      = plugs.path      = require('path')
    const stringify = plugs.stringify = require('json-stringify-pretty-compact')
    const tap       = plugs.tap       = require('gulp-tap')
    const util      = plugs.util      = require('util')
    const yaml      = plugs.yaml      = require('js-yaml')

    if(fs.existsSync(plug.yamlFile)) {
	const yamlContents = fs.readFileSync(plug.yamlFile, 'utf8')
	plug.data = yaml.safeLoad(yamlContents)
	plug.name = plug.data.name_short || plug.data.name
	plug.distPath = plug.data.manifest.dest || '.dist'
	plug.srcPath = plug.data.manifest.src || 'src'
	plug.deps = plug.data.dependencies
    }

    plug.pipe = {}
    plug.quiet = argv.quiet
    plug.pipe.handleError = err => {
	notify.onError({
            title: "Gulp error in " + err.plugin,
            message:  err.toString()
	})(err)

	gutil.beep()
	this.emit('end')
    }

    plug.task = (taskName, fn) => {
	if(plug.registeredTasks[taskName]) return
	plug.registeredTasks[taskName] = true
	plug.log(`task registed: ${chalk.cyan(taskName)}`)
	gulp.task(taskName, fn)
    }

    plug.watch = (files, series) => {
	plug.log(`watch -> ${files}`)
	gulp.watch(files, series)
    }

    plug.log = (message, object) => {
	if(plug.quiet) return

	console.log(chalk.blue.bold(`${plug.name}: `) + message)
	const delim = chalk.gray('|')
	if(object) {
	    for (key in object) {
		val = stringify(object[key])
		console.log(util.format('%s %s %s', delim, key.padEnd(10), val))
	    }
	}
    }

    plug.task('clean', () => {
	const path = `${plug.distPath}/**`
	plug.log(`cleaning ${plug.distPath}`)
	return plugs.del([`${plug.distPath}/**`], {
	    force: true
	})
    })

    plug.task('images', () => {
	plug.log(`images gulped to ${plug.distPath}/images`, plug.deps.images)
	return gulp
	    .src(plug.deps.images)
	    .pipe(g.flatten())
	    .pipe(gulp.dest(`${plug.distPath}/images`))
    })

    plug.task('fonts', () => {
	plug.log(`fonts gulped to ${plug.distPath}/fonts`, plug.deps.fonts)
	return gulp
	    .src(plug.deps.fonts)
	    .pipe(g.flatten())
	    .pipe(gulp.dest(`${plug.distPath}/fonts`))
	
    })

    plug.task('styles', () => {
	plug.log(`styles gulped to ${plug.distPath}/app.css`, plug.deps.styles)
	return gulp
	    .src(plug.deps.styles)
	    .pipe(g.concat('app'))
	    .pipe(g.sass({
		includePaths: [
		    plug.srcPath,
		    './node_modules',
		]
	    }).on('error', plug.pipe.handleError))
	    .pipe(gulpif(plug.flags.minify, g.uglifycss()))
	    .pipe(plug.flags.browserSync ? plug.browserSync.stream() : tap(()=>{}))
	    .on('error', plug.pipe.handleError)                                                
	    .pipe(gulp.dest(plug.distPath))
    })

    plug.task('scripts', () => {
	plug.log(`scripts gulped to ${plug.distPath}/app.js`, plug.deps.scripts)
	return gulp
	    .src(plug.deps.scripts)
	    .pipe(g.eslint())
	    .pipe(g.babel())
	    .pipe(gulpif(plug.flags.minify, g.uglify({})))
            .pipe(g.concat('app.js'))
            .pipe(plug.flags.browserSync ? plug.browserSync.stream() : tap(()=>{}))
            .on('error', plug.pipe.handleError)                                        
            .pipe(gulp.dest(plug.distPath))
    })

    plug.task('info', end => {
	plug.log(`plugin info loaded from ${plug.yamlFile}`)
	console.log(stringify(plug.data))
	return end()
    })

    plug.task('check', end => {
	console.log(chalk.green(`${plug.yamlFile} is valid.`))
	console.log(chalk.green(`${__filename} is valid.`))
	return end()
    })

    plug.task('build', gulp.series('clean', gulp.parallel('scripts', 'styles', 'images', 'fonts')))

    plug.task('watch', () => {
	plug.flags.browserSync = true
	plug.browserSync = require('browser-sync').create()
	plug.browserSync.init()

	gulp.watch(`${plug.srcPath}/**/*.{jpg,png,ico}`, gulp.series('images'))
	gulp.watch(`${plug.srcPath}/**/*.js`, gulp.series('scripts'))
	gulp.watch(`${plug.srcPath}/**/*.scss`, gulp.series('styles'))
    })
}

module.exports = {
    theme: plug
}
