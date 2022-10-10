/**
 * 载入 vue dll 插件，如果不存在，通过cdn远程下载 mainifest
 */
const webpack = require('webpack')
const webpackPkg = require('webpack/package.json')
const loader = require('./loader') // 资源加载器
const util = require('./util') // 工具函数方法
const axios = require('axios') // axios加载库
const crypto = require('crypto') // node.js中crypto方法
const path = require('path') // 引入路径
const { spawn } = require('child_process') // 引入子进程
const chalk = require('chalk')
const readPkg = require('read-pkg') // 读取package.json文件

const basePath = `/build/h5-library`
const cdnBaseUrl = `xxx${basePath}`
const ossBaseUrl = `xxx${basePath}`
const ossTestBaseUrl = `xxxx${basePath}`

const ImportDependencyType = 'import()'  // 处理异步模块

const webpackArr = webpackPkg.version.split('.') // 读取webpack版本
const isOldWebpack = parseInt(webpackArr[0]) < 5 // 判断是否是老的webpack

const axiosClient = axios.create({
  headers: {
    'Cache-Control': 'no-cache'
  }
})

const extMap = {
  js: loader.loadJs,
  css: loader.loadCss
}

/**
 * 获取当前调用的目录路径
 */
function extractCallDir() {
  // extract callsite file location using error stack
  const obj = {}
  Error.captureStackTrace(obj)
  const callSite = obj.stack.split('\n')[1]
  const arr = callSite.split('node_modules')
  const arr1 = arr[0].split('(')
  return arr1[1]
}

/**
 * 获取library cdn链接
 * @param {*} library npm包名
 * @param {*} test 是否测试环境
 * @param {*} useCdn 是否使用cdn域名
 * @param {*} useBabel 是否使用babel转换
 */
function getLibraryUrl(library, test = false, useCdn = true, useBabel = false) {
  return new Promise((resolve, reject) => {
    const package = util.getLibraryPackage(library)
    readPkg({ cwd: `node_modules/${package}` }).then(
      (pkg) => {
        const fileName = util.formatLibraryVersion(pkg.version)
        const baseUrl = test ? ossTestBaseUrl : useCdn ? cdnBaseUrl : ossBaseUrl
        resolve(`${baseUrl}/${library}/${fileName}${useBabel ? '-legacy' : ''}.js`)
      },
      (error) => {
        const err = new Error(`获取${library}配置异常！`)
        err.detail = error
        reject(err)
      }
    )
  })
}

/**
 * 执行函数
 * @param {*} content
 */
const evalFunction = function (content) {
  return `(function() { ${content} })()`
}

/**
 * 加载模块
 * @param {*} content
 * @param {*} id
 * @description __esModule = true 是为了告诉webpack直接返回promise，否则webpack会转为Object返回，这样就不能在promise里链式调用了
 */
const loadModuleFunction = function (content, id) {
  return `
       var promise = null;
       if (document.getElementById('${id}')) {
         promise = new Promise(function(resolve, reject) {
           resolve();
         });
       } else {
         ${content}
       }
       var p = Promise.all([promise]).then(function(r) {
         return r[0];
       });
       p.__esModule = true;
       return p;
     `
}

class StaticLibraryPlugin {
  constructor(options) {
    const userOptions = options || {}
    const defaultOptions = {
      test: -1, // 是否是测试环境，-1 则根据当前的 webpack mode 来处理
      allowList: [], // 白名单，如果不为空，只处理列表中的package，优先级大于黑名单
      blockList: [] // 黑名单，如果不为空，过滤列表中的package
    }
    this.options = Object.assign(defaultOptions, userOptions)
    this.asyncLibraries = [] // 异步的库
    this.asyncLibraryConfig = {} // 异步库的配置
    this.externalsPluginApplied = false
  }

  apply(compiler) {
    // if (compiler.options.target !== 'web') {
    //   // 非浏览器环境不启用
    //   return
    // }

    const useTestEnv = this.options.test === -1 ? compiler.options.mode !== 'production' : !!this.options.test

    const rules = compiler.options.module.rules || []
    const babelRules = [] // babel转换的规则
    console.log(rules, 'oooooo')
    for (const rule of rules) {
      const use = rule.use || []
      for (const item of use) {
        if (item.loader.indexOf('babel') >= 0) {
          babelRules.push(rule)
        }
      }
    }

    /**
     * 解析模块
     */
    // console.log(compiler.hooks.normalModuleFactory, '=====')
    compiler.hooks.normalModuleFactory.tap('StaticLibraryPlugin', (nmf) => 
    {
      nmf.hooks.beforeResolve.tap('StaticLibraryPlugin', (result) => {
        // console.log(result,'我是谁是')
        console.log(nmf,'=====')
        const dependencies = result.dependencies || []
        const library = result.request
        let hasAsyncImport = false
        for (let i = 0, len = dependencies.length; i < len; i++) {
          const dependence = dependencies[i]
          // console.log(dependence,'====',dependence.type)
          if (dependence.type === ImportDependencyType) {
            hasAsyncImport = true
            break
          }
        }
        // 判定是否异步引入的模块
        if (hasAsyncImport && library.indexOf('.') !== 0 && library.indexOf('@/') !== 0 && library.indexOf('~') !== 0) {
          let addLibrary = false
          const allowList = this.options.allowList || []
          const blockList = this.options.blockList || []
          if (allowList && allowList.length > 0) {
            if (allowList.includes(library)) {
              addLibrary = true
            }
          } else if (blockList && blockList.length) {
            if (blockList.includes(library)) {
              addLibrary = false
            } else {
              addLibrary = true
            }
          } else {
            addLibrary = true
          }
          if (addLibrary && !this.asyncLibraries.includes(library)) {
            // 检查库是否需要 babel 转换，检测是通过路径来的，所以不用考虑 index.js 不存在的情况
            const filepath = path.resolve(extractCallDir(), `./node_modules/${library}/index.js`)
            let useBabel = false
            for (const rule of babelRules) {
              if (rule.resourceQuery && !rule.resourceQuery(filepath)) {
                continue
              }
              if (rule.resource && rule.resource(filepath)) {
                useBabel = true
              }
            }
            this.asyncLibraryConfig[library] = {
              useBabel
            }
            this.asyncLibraries.push(library)
          }
        }
        if (isOldWebpack) {
          return result
        }
      })
    })

    /**
     * 由于 ExternalModuleFactoryPlugin 没有对外暴露，所以在编译前通过 ExternalsPlugin 实现
     */
    compiler.hooks.beforeCompile.tap('StaticLibraryPlugin', () => {
      if (!this.externalsPluginApplied) {
        // 只注册一次插件，beforeCompile 会触发多次，暂时还不了解为什么
        this.externalsPluginApplied = true
        function externalsFunction(request, callback) {
          // console.log(12345, request, this.asyncLibraries)
          if (this.asyncLibraries.includes(request)) {
            const libraryConfig = this.asyncLibraryConfig[request]
            getLibraryUrl(request, useTestEnv, true, libraryConfig.useBabel).then(
              (cdnUrl) => {
                let ext = cdnUrl.split('.').pop()
                if (!extMap[ext]) {
                  ext = 'js'
                }
                const id = crypto.createHash('md5').update(cdnUrl).digest('hex')
                callback(null, evalFunction(loadModuleFunction(extMap[ext].call(null, cdnUrl, id, request), id)))
              },
              (err) => {
                console.log(err)
                callback(err)
              }
            )
          } else {
            callback()
          }
        }
        if (isOldWebpack) {
          new webpack.ExternalsPlugin('var', (context, request, callback) => {
            externalsFunction.call(this, request, callback)
          }).apply(compiler)
        } else {
          new webpack.ExternalsPlugin('var', ({ request }, callback) => {
            externalsFunction.call(this, request, callback)
          }).apply(compiler)
        }
      }
    })

    /**
     * 编译成功后单独构建library
     */
    compiler.hooks.afterCompile.tapPromise('StaticLibraryPlugin', () => {
      const tasks = [
        new Promise((resolve) => {
          resolve()
        })
      ]
      if (this.asyncLibraries.length) {
        const buildEntry = path.resolve(__dirname, '../bin/build-lib.js')
        const cmd = `node ${buildEntry} -n `
        while (true) {
          const library = this.asyncLibraries.shift()
          if (!library) {
            break
          }
          tasks.push(
            new Promise((resolve, reject) => {
              const libraryConfig = this.asyncLibraryConfig[library]
              const useBabel = libraryConfig.useBabel
              getLibraryUrl(library, useTestEnv, false, useBabel).then(
                (libraryUrl) => {
                  axiosClient
                    .head(libraryUrl)
                    .then(
                      (res) => {
                        if (res.status !== 200 || !res.headers['x-oss-object-type']) {
                          return Promise.resolve({ exists: false })
                        }
                        return Promise.resolve({ exists: true })
                      },
                      () => {
                        return Promise.resolve({ exists: false })
                      }
                    )
                    .then(({ exists }) => {
                      if (!exists) {
                        const spawnObj = spawn(`${cmd}${library} -t ${useTestEnv ? 1 : 0} -b ${useBabel ? 1 : 0}`, {
                          shell: true,
                          stdio: 'inherit'
                        })
                        spawnObj.on('exit', (code) => {
                          if (code) {
                            reject(
                              new Error(
                                chalk.yellow(
                                  `library: ${library} 构建失败，请重新执行构建，如果一直失败，请联系插件开发者~`
                                )
                              )
                            )
                          } else {
                            resolve()
                          }
                        })
                      } else {
                        resolve()
                      }
                    })
                },
                (error) => {
                  reject(new Error(chalk.yellow(error.message)))
                }
              )
            })
          )
        }
      }
      return Promise.all(tasks)
    })
  }
}

module.exports = {
  StaticLibraryPlugin,
  basePath
}
