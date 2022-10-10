/**
 * 格式化版本号
 * @param {*} version
 */
function formatLibraryVersion(version) {
  return version.replace(/\./g, '_')
}

const { hasOwnProperty } = Object.prototype

/**
 * @param {object} object
 * @param {array} props
 * @returns {object}
 */
function pick(object, props = []) {
  return props.reduce((acc, key) => {
    let sourceKey
    let targetKey

    if (Array.isArray(key)) {
      ;[sourceKey, targetKey] = key
    } else {
      sourceKey = key
      targetKey = key
    }

    if (hasOwnProperty.call(object, sourceKey)) {
      acc[targetKey] = object[sourceKey]
    }

    return acc
  }, {})
}

/**
 * 获取文件所在的package
 * @param {*} library
 * @returns
 */
function getLibraryPackage(library) {
  const arr = library.split('/')
  const hasNamespace = arr[0].indexOf('@') === 0
  return (hasNamespace ? arr.slice(0, 2) : arr.slice(0, 1)).join('/')
}

module.exports = {
  formatLibraryVersion,
  pick,
  getLibraryPackage
}
