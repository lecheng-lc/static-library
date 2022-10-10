let OSS = require('ali-oss')
const path = require('path')
const mime = require('mime')
const fs = require('fs')
const BUCKEY = 'xxx-static'
const ACCESS_KEY_SECRET = 'xxx'
const ACCESS_KEY_ID = 'xxx'
const REGION = 'oss-cn-beijing'
let client = new OSS({
  region: REGION,
  accessKeyId: ACCESS_KEY_ID,
  accessKeySecret: ACCESS_KEY_SECRET,
  bucket: BUCKEY,
  secure: true
})
const distPath = '../dist-tmp'
const basePath = '/test/dist-tmp'
function getAllFiles(dirPath, cb) {
  fs.readdir(dirPath, function (err, files) {
    if (err) {
      cb(err)
      return
    }
    let filePaths = []
    let errors = []
    let dirPaths = []
    let count = 0
    let statCount = 0
    files.forEach(function (filename) {
      const filePath = path.resolve(dirPath, filename)
      count++
      fs.stat(filePath, function (err1, stats) {
        if (err1) {
          errors.push(err1)
        } else {
          const isFile = stats.isFile()
          const isDir = stats.isDirectory()
          if (isFile) {
            filePaths.push(filePath)
          }
          if (isDir) {
            dirPaths.push(filePath)
          }
        }
        statCount++
        if (statCount === count) {
          endStat()
        }
      })
    })
    if (!files.length) {
      endStat()
    }
    function endStat() {
      if (dirPaths.length > 0) {
        let childCount = 0
        let childStatCount = 0
        dirPaths.forEach(function (childDirPath) {
          childCount++
          getAllFiles(childDirPath, function (err, stats) {
            childStatCount++
            if (err) {
              errors.push(err)
            } else {
              errors = errors.concat(stats.errors)
              filePaths = filePaths.concat(stats.filePaths)
            }
            if (childStatCount === childCount) {
              cb(null, {
                filePaths,
                errors
              })
            }
          })
        })
      } else {
        cb(null, {
          filePaths,
          errors
        })
      }
    }
  })
}
async function uploadFile (ossPath ,filePath , uploadOptions, callback) {
  try {
    const result = await client.multipartUpload(filePath, ossPath, uploadOptions)
    callback(result.res.status === 200)
    return result
  } catch (e) {
    console.log(e)
  }
}
function publsih(config, cb) {
  let distPath = config.distPath ? config.distPath : distPath
  let basepath = config.basePath ? config.basePath : basePath
  const ignoreNames = config.ignoreNames ? config.ignoreNames : []
  const ignorePaths= config.ignorePaths ? config.ignorePaths : []
  const httpCacheIgnoreNames = config.httpCacheIgnoreNames || []
  const enableHttpCache = config.enableHttpCache || false
  const uploadOptions = {
    timeout: 180000,
    maxSockets : 30,
    retryMax: 2
  }
  if (enableHttpCache) {
    uploadOptions.headers = {
      'cache-control': 'public,max-age=31536000,immutable'
    }
  }
  distPath = path.resolve(distPath)
  const divider = '----------------------------------------'
  console.info('start upload files to aliyun oss bucket:' + BUCKEY + ' ...')
  console.info(divider)
  getAllFiles(distPath, (err, stats) => {
    // console.log(888777,err,distPath)
    if (!err) {
      const filePaths = stats.filePaths
      let allCount = 0
      let successCount = 0
      let errorCount = 0
      const errorFilePaths = []
      filePaths.forEach(function (filePath) {
        const ossPath = filePath.replace(distPath, basePath).replace(/\\/g, '/')
        const filename = path.basename(filePath)
        let canUpLoad = ignorePaths.every(item=>{
          return !filePath.includes(item)
        })
        if (ignoreNames.indexOf(filename) === -1 && canUpLoad) {
          allCount++
          const _uploadOptions = httpCacheIgnoreNames.indexOf(filename) >= 0 ? null: Object.assign({
            mime: mime.getType(filePath)
          }, uploadOptions)
          uploadFile(filePath, ossPath, _uploadOptions, function (res) {
            if (!res) {
              errorFilePaths.push(filePath)
              errorCount++
            } else {
              successCount++
            }
            if (successCount + errorCount === allCount) {
              callback(null, {
                successCount,
                errorCount,
                errorFilePaths
              })
            }
          })
        }
      })
    } else {
      callback(err)
    }
  })
  function callback(err, stats) {
    if (err) {
      console.log('end upload with error:' + err)
    } else {
      console.log('😄 upload files to ali-oss bucket:' + BUCKEY + ' success:' + stats.successCount + ' failed:' + stats.errorCount + '\n')
    }
    if (cb) {
      cb(err, stats)
    }
  }
}
const publishOptions = {
  distPath,
  basePath,
  ignorePaths: ['.next/cache'],
  ignoreNames: []
}
module.exports = {
  publishMethod: ()=>{
    publsih(publishOptions)
  }
}