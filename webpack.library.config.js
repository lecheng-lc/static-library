const path = require('path')
const util = require('./src/util')
const readPkg = require('read-pkg')
const chalk = require('chalk')

function checkDependencies(dependencies) {
  for (const name of dependencies) {
    try {
      require(name)
    } catch (err) {
      console.log('static-library build error: 请先安装依赖 ' + chalk.red(name))
      return false
    }
  }
  return true
}

/**
 * 构建库所需的webpack配置
 * @param {string} library 库名称
 * @param {boolean} useBabel 是否使用 babel 转换代码
 */
function buildLibraryConfig(library, useBabel = false) {
  const package = util.getLibraryPackage(library)
  return readPkg({ cwd: `node_modules/${package}` }).then((pkg) => {
    const filename = util.formatLibraryVersion(pkg.version)
    const config = {
      mode: 'production',
      entry: library,
      output: {
        path: path.join(__dirname, `./dist-tmp/${library}/`),
        filename: `${filename}.js`,
        library: library,
        libraryTarget: 'umd'
      }
    }
    if (useBabel) {
      if (!checkDependencies(['@babel/core', '@babel/preset-env', 'babel-loader', 'core-js'])) {
        return process.exit(1)
      }
      config.output.filename = `${filename}-legacy.js`
      config.module = {
        rules: [
          {
            test: /\.js$/,
            loader: 'babel-loader'
          }
        ]
      }
    }
    return config
  })
}

module.exports = {
  buildLibraryConfig
}
