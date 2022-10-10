const fs = require('fs')
const path = require('path')
const semver = require('semver')
const dateFns = require('date-fns')

/**
 * 获取下一个版本号
 * @param {*} version
 */
function getNextVersion(version) {
  let major = semver.major(version)
  let minor = semver.minor(version)
  let patch = semver.patch(version)
  if (patch == 9) {
    if (minor == 9) {
      major = major + 1
      minor = 0
      patch = 0
    } else {
      minor = minor + 1
      patch = 0
    }
  } else {
    patch = patch + 1
  }
  return major + '.' + minor + '.' + patch
}

/**
 * 设置版本
 */
function setPackageJsonVersion() {
  const filePath = path.join(__dirname, '/../package.json')
  let pkg = fs.readFileSync(filePath).toString()
  pkg = JSON.parse(pkg)
  pkg.version = getNextVersion(pkg.version)
  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2))
  return pkg.version
}

/**
 * 设置CHANGELOG
 */
function setChangeLog(newVersion) {
  const filePath = path.join(__dirname, '/../CHANGELOG.md')
  let content = fs.readFileSync(filePath).toString()
  content = `\n${content}`
  let newContent = `# v${newVersion}\n\n`
  newContent += dateFns.format(new Date(), 'yyyy-MM-dd') + '\n\n'
  newContent += '* [UPDATE] \n'
  newContent += content
  fs.writeFileSync(filePath, newContent)
}

const newVersion = setPackageJsonVersion()
setChangeLog(newVersion)

console.log('------------------------')
console.log('请完善CHANGELOG，然后再publish~')
console.log('------------------------')
