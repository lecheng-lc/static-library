#!/usr/bin/env node
const commander = require('commander')
const { publishMethod } = require('./upload')
const util = require('../src/util')
const path = require('path')
const pkg = require('../package.json')
const webpack = require('webpack')
const { buildLibraryConfig } = require('../webpack.library.config')
const fsExtra = require('fs-extra')
const chalk = require('chalk')
const { basePath } = require('../src/plugin')
const OSS_DOMAIN = 'XXXX' // 静态资源站点域名
function list(val) {
  return val.replace(/(，|\s)/gi, ',').split(',')
}

commander
  .version(pkg.version, '-v, --version')
  .description('A cli interface of build library to ali-oss.')
  .option('-n, --name <name>', 'the package name of the library, if multi, separator use ,', list)
  .option(
    '-t, --test <test>',
    'set bucktet env, 0 with bucket: xxx, 1 with bucket: xxx-test, default: 1',
    parseInt
  )
  .option('-b, --babel <babel>', 'use babel-loader to transpile, default: 0', parseInt)
  .option('-s, --silent <silent>', 'disable output log, default: 0', parseInt)
  .parse(process.argv)

if (process.argv.length <= 2) {
  return commander.help()
}

const options = util.pick(commander, ['test', 'name', 'silent', 'babel'])

const silent = options.hasOwnProperty('silent') ? options.silent : 0
if (!options.hasOwnProperty('name') || !options.name.length) {
  console.log(
    chalk.yellow(`
请用参数 -n 指定 library 的名称~
`)
  )
  return process.exit(1)
}

const useBabel = options.hasOwnProperty('babel') ? options.babel : 0

for (let i = 0, len = options.name.length; i < len; i++) {
  const library = options.name[i].trim()
  try {
    buildLibraryConfig(library, useBabel).then(
      (config) => {
        webpack(config, function (err) {
          if (err) {
            console.log(`${library} 构建失败:` + err.message)
            return process.exit(3)
          }
          const tmpPath = path.join(__dirname, `../dist-tmp/${library}`)
          const testBucket = options.hasOwnProperty('test') ? !!options.test : true
          const domain = OSS_DOMAIN
          publishMethod(
            {
              distPath: tmpPath,
              basePath: `${basePath}/${library}`,
              test: testBucket,
              enableHttpCache: true
            },
            (err) => {
              if (!silent) {
                console.log('')
                if (!err) {
                  console.log(
                    `${library} 构建成功: ` + chalk.green(`${OSS_DOMAIN}${basePath}/${library}/${config.output.filename}`)
                  )
                } else {
                  console.log(`${library} 上传失败: `, err.message)
                }
                console.log('')
              }
              // 删除临时目录
              fsExtra.removeSync(tmpPath)
              if (err) {
                process.exit(4)
              }
            }
          )
        })
      },
      (err) => {
        !silent && console.log(`${library} 生成构建配置文件出错: ` + chalk.red(error.message))
      }
    )
  } catch (error) {
    !silent && console.log(`${library} 配置加载出错: ` + chalk.red(error.message))
    process.exit(2)
  }
}
