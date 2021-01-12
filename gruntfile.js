const fs = require('fs')
const path = require('path')
const ChildProcess = require('child_process')
const packager = require('electron-packager')

const WIN = process.platform === 'win32'

module.exports = function (grunt) {
	var authCode
	try {
		authCode = grunt.file.readJSON('secret/auth_code.json')
	} catch (e) {
		if (e.origError.code === 'ENOENT') {
			console.warn('secret/auth_code.json is not found. CodeSigning is not available.')
		}
	}
	const OSX_COMMON_NAME = authCode != null ? authCode.OSX_COMMON_NAME : ''
	const WIN_CERT_PASSWORD = authCode != null ? authCode.WIN_CERT_PASSWORD : ''

	var initConfig = {
		pkg: grunt.file.readJSON('package.json'),
		'create-windows-installer': {
			x64: {
				appDirectory: path.join(__dirname, 'dist', 'Teanote-win32-x64'),
				outputDirectory: path.join(__dirname, 'dist'),
				authors: 'MAISIN&CO., Inc.',
				exe: 'Teanote.exe',
				loadingGif: path.join(__dirname, 'resources/boostnote-install.gif'),
				iconUrl: path.join(__dirname, 'resources/app.ico'),
				setupIcon: path.join(__dirname, 'resources/dmg.ico'),
				certificateFile: path.join(__dirname, 'secret', 'authenticode_cer.p12'),
				certificatePassword: WIN_CERT_PASSWORD,
				noMsi: true
			}
		},
		'electron-installer-debian': {
			app: {
				options: {
					name: 'teanote',
					productName: 'Teanote',
					genericName: 'Teanote',
					productDescription: 'The opensource note app for developer.',
					arch: 'amd64',
					categories: [
						'Development',
						'Utility'
					],
					icon: path.join(__dirname, 'resources/app.png'),
					bin: 'Teanote'
				},
				src: path.join(__dirname, 'dist', 'Teanote-linux-x64'),
				dest: path.join(__dirname, 'dist')
			}
		},
		'electron-installer-redhat': {
			app: {
				options: {
					name: 'teanote',
					productName: 'Teanote',
					genericName: 'Teanote',
					productDescription: 'The opensource note app for developer.',
					arch: 'x86_64',
					categories: [
						'Development',
						'Utility'
					],
					icon: path.join(__dirname, 'resources/app.png'),
					bin: 'Teanote'
				},
				src: path.join(__dirname, 'dist', 'Teanote-linux-x64'),
				dest: path.join(__dirname, 'dist')
			}
		}
	}

	grunt.initConfig(initConfig)
	grunt.loadNpmTasks('grunt-electron-installer')
	if (!WIN) {
		grunt.loadNpmTasks('grunt-electron-installer-debian')
		grunt.loadNpmTasks('grunt-electron-installer-redhat')
	}

	grunt.registerTask('compile', function () {
		var done = this.async()
		var execPath = path.join('node_modules', '.bin', 'webpack') + ' --config webpack-production.config.js'
		grunt.log.writeln(execPath)
		ChildProcess.exec(execPath,
			{
				env: Object.assign({}, process.env, {
					BABEL_ENV: 'production',
					NODE_ENV: 'production'
				})
			},
			function (err, stdout, stderr) {
				grunt.log.writeln(stdout)

				if (err) {
					grunt.log.writeln(err)
					grunt.log.writeln(stderr)
					done(false)
					return
				}
				done()
			}
		)
	})

	grunt.registerTask('pack', function (platform) {
		grunt.log.writeln(path.join(__dirname, 'dist'))
		var done = this.async()
		var opts = {
			name: 'Teanote',
			arch: 'x64',
			dir: __dirname,
			version: grunt.config.get('pkg.config.electron-version'),
			'app-version': grunt.config.get('pkg.version'),
			'app-bundle-id': 'org.zokugun.teanote',
			asar: false,
			prune: true,
			overwrite: true,
			out: path.join(__dirname, 'dist'),
			ignore: /node_modules\/ace-builds\/(?!src-min)|node_modules\/ace-builds\/(?=src-min-noconflict)|node_modules\/devicon\/icons|^\/browser|^\/secret|\.babelrc|\.gitignore|^\/\.gitmodules|^\/gruntfile|^\/readme.md|^\/webpack|^\/appdmg\.json|^\/node_modules\/grunt/
		}
		switch (platform) {
			case 'win':
				Object.assign(opts, {
					platform: 'win32',
					icon: path.join(__dirname, 'resources/app.ico'),
					'version-string': {
						CompanyName: 'MAISIN&CO., Inc.',
						LegalCopyright: '© 2015 MAISIN&CO., Inc. All rights reserved.',
						FileDescription: 'Teanote',
						OriginalFilename: 'Teanote',
						FileVersion: grunt.config.get('pkg.version'),
						ProductVersion: grunt.config.get('pkg.version'),
						ProductName: 'Teanote',
						InternalName: 'Teanote'
					}
				})
				packager(opts, function (err, appPath) {
					if (err) {
						grunt.log.writeln(err)
						done(err)
						return
					}
					done()
				})
				break
			case 'osx':
				Object.assign(opts, {
					platform: 'darwin',
					icon: path.join(__dirname, 'resources/app.icns'),
					'app-category-type': 'public.app-category.developer-tools'
				})
				packager(opts, function (err, appPath) {
					if (err) {
						grunt.log.writeln(err)
						done(err)
						return
					}
					done()
				})
				break
			case 'linux':
				Object.assign(opts, {
					platform: 'linux',
					icon: path.join(__dirname, 'resources/app.icns'),
					'app-category-type': 'public.app-category.developer-tools'
				})
				packager(opts, function (err, appPath) {
					if (err) {
						grunt.log.writeln(err)
						done(err)
						return
					}
					done()
				})
				break
		}
	})

	grunt.registerTask('codesign', function (platform) {
		var done = this.async()
		if (process.platform !== 'darwin') {
			done(false)
			return
		}

		ChildProcess.exec(`codesign --verbose --deep --force --sign \"${OSX_COMMON_NAME}\" dist/Teanote-darwin-x64/Teanote.app`,
			function (err, stdout, stderr) {
				grunt.log.writeln(stdout)
				if (err) {
					grunt.log.writeln(err)
					grunt.log.writeln(stderr)
					done(false)
					return
				}
				done()
			})
	})

	grunt.registerTask('create-osx-installer', function () {
		var done = this.async()
		var execPath = 'appdmg appdmg.json dist/Teanote-mac.dmg'
		grunt.log.writeln(execPath)
		ChildProcess.exec(execPath,
			function (err, stdout, stderr) {
				grunt.log.writeln(stdout)
				if (err) {
					grunt.log.writeln(err)
					grunt.log.writeln(stderr)
					done(false)
					return
				}
				done()
			})
	})

	grunt.registerTask('zip', function (platform) {
		var done = this.async()
		switch (platform) {
			case 'osx':
				var execPath = 'cd dist/Teanote-darwin-x64 && zip -r -y -q ../Teanote-mac.zip Teanote.app'
				grunt.log.writeln(execPath)
				ChildProcess.exec(execPath,
					function (err, stdout, stderr) {
						grunt.log.writeln(stdout)
						if (err) {
							grunt.log.writeln(err)
							grunt.log.writeln(stderr)
							done(false)
							return
						}
						done()
					}
				)
				break
			default:
				done()
				return
		}
	})

	function getTarget() {
		switch (process.platform) {
			case 'darwin':
				return 'osx'
			case 'win32':
				return 'win'
			case 'linux':
				return 'linux'
			default:
				return process.platform
		}
	}

	grunt.registerTask('build', function (platform) {
		if (platform == null) platform = getTarget()

		switch (platform) {
			case 'win':
				grunt.task.run(['compile', 'pack:win', 'create-windows-installer'])
				break
			case 'osx':
				grunt.task.run(['compile', 'pack:osx', 'codesign', 'create-osx-installer', 'zip:osx'])
				break
			case 'linux':
				grunt.task.run(['compile', 'pack:linux', 'electron-installer-debian', 'electron-installer-redhat'])
				break
		}
	})

	grunt.registerTask('pre-build', function (platform) {
		if (platform == null) platform = getTarget()

		switch (platform) {
			case 'win':
				grunt.task.run(['compile', 'pack:win'])
				break
			case 'osx':
				grunt.task.run(['compile', 'pack:osx'])
				break
			case 'linux':
				grunt.task.run(['compile', 'pack:linux'])
		}
	})

	grunt.registerTask('bfm', function () {
		const Color = require('color')
		const parseCSS = require('css').parse

		function generateRule(selector, bgColor, fgColor, bgSelColor) {
			const evenColor = bgColor.isLight() ? bgColor.mix(fgColor, 0.05) : bgColor.mix(fgColor, 0.1)
			const activeColor = bgColor.isLight() ? bgColor.mix(fgColor, 0.1) : bgColor.mix(fgColor, 0.2)
			const selColor = bgSelColor.isLight() ? bgSelColor.mix(fgColor, 0.1) : bgSelColor.mix(fgColor, 0.2)

			if (selector && selector.length > 0) {
				return `${selector} .cm-table-row-even { background-color: ${evenColor.rgb().string()}; }
${selector}.CodeMirror .CodeMirror-activeline-background { background: transparent; }
${selector}.CodeMirror .CodeMirror-activeline .cm-table-row { background-color: ${activeColor.rgb().string()}; }
${selector}.CodeMirror .CodeMirror-activeline .cm-table-row.CodeMirror-selectedtext { background-color: ${selColor.rgb().string()}; }`
			} else {
				return `.cm-table-row-even { background-color: ${evenColor.rgb().string()}; }
.CodeMirror-activeline-background { background: transparent; }
.CodeMirror-activeline .cm-table-row { background-color: ${activeColor.rgb().string()}; }
.CodeMirror-activeline .cm-table-row.CodeMirror-selectedtext { background-color: ${selColor.rgb().string()}; }`
			}
		}

		const root = path.join(__dirname, 'node_modules/codemirror/theme/')

		const colors = fs.readdirSync(root).filter(file => file !== 'solarized.css').map(file => {
			const css = parseCSS(fs.readFileSync(path.join(root, file), 'utf8'))
			let selector = null
			let bgColor = Color('white')
			let fgColor = Color('black')
			let bgSelColor = Color('white')

			const rules = css.stylesheet.rules.filter(rule => rule.selectors && /\b\.CodeMirror$/.test(rule.selectors[0]))
			if (rules.length === 1) {
				selector = `.${rules[0].selectors[0].split('.')[1]}`

				rules[0].declarations.forEach(declaration => {
					if (declaration.property === 'background-color' || declaration.property === 'background') {
						bgColor = Color(declaration.value.split(' ')[0])
						bgSelColor = bgColor
					} else if (declaration.property === 'color') {
						const value = /^(.*?)(?:\s*!important)?$/.exec(declaration.value)[1]
						const match = /^rgba\((.*?),\s*1\)$/.exec(value)
						if (match) {
							fgColor = Color(`rgb(${match[1]})`)
						} else {
							fgColor = Color(value)
						}
					}
				})

				for(const rule of css.stylesheet.rules) {
					if(rule.selectors) {
						if(rule.selectors[0] === `${selector} div.CodeMirror-selected`) {
							rule.declarations.forEach(declaration => {
								if (declaration.property === 'background-color' || declaration.property === 'background') {
									const value = /^(.*?)(?:\s*!important)?$/.exec(declaration.value)[1]
									const match = /^rgba?\((.*?),\s*1\)$/.exec(value)
									if (match) {
										bgSelColor = Color(`rgb(${match[1]})`)
									} else {
										bgSelColor = Color(value)
									}
								}
							})
						}
						else if(rule.selectors[0] === `${selector}.CodeMirror-focused div.CodeMirror-selected`) {
							rule.declarations.forEach(declaration => {
								if (declaration.property === 'background-color' || declaration.property === 'background') {
									const value = /^(.*?)(?:\s*!important)?$/.exec(declaration.value)[1]
									const match = /^rgba?\((.*?),\s*1\)$/.exec(value)
									if (match) {
										bgSelColor = Color(`rgb(${match[1]})`)
									} else {
										bgSelColor = Color(value)
									}
								}
							})
						}
					}
				}
			}

			if(selector) {
				return generateRule(selector, bgColor, fgColor, bgSelColor)
			}
		}).filter(value => !!value)

		// default
		colors.unshift(generateRule(null, Color('white'), Color('black'), Color('#d7d4f0')))
		// solarized dark
		colors.push(generateRule('.cm-s-solarized.cm-s-dark', Color('#002b36'), Color('#839496'), Color('#073642')))
		// solarized light
		colors.push(generateRule('.cm-s-solarized.cm-s-light', Color('#fdf6e3'), Color('#657b83'), Color('#eee8d5')))

		fs.writeFileSync(path.join(__dirname, 'extra_scripts/codemirror/mode/bfm/bfm.css'), colors.join('\n'), 'utf8')
	})

	grunt.registerTask('default', ['build'])
}
