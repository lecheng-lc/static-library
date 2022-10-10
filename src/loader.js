/**
 * 加载js
 * @param {*} request
 * @param {*} id
 * @summary 之前打包时会把 library 中的 . 号转为 _ , 兼容处理一下
 */
function loadJs(request, id, module) {
  return `var loadJsFunc = function(resolve, reject) {
    var script = document.createElement('script');
    script.src = '${request}';
    script.id = '${id}';
    script.async = false;
    (document.head || document.body).appendChild(script);
    script.onload = function() {
      var m = { default: window['${module.replace(/\./g, '_')}'] || window['${module}'] }
      typeof resolve == 'function' && resolve(m);
    };
    script.onerror = function(error) {
      typeof reject == 'function' && reject(error);
    };
  };
  promise = new Promise(function(resolve, reject) {
    loadJsFunc(resolve, reject);
  });`
}

/**
 * 加载css
 * @param {*} request
 * @param {*} id
 */
function loadCss(request, id) {
  return `var loadCssFunc = function(resolve, reject){
    var link = document.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = '${request}';
    link.id = '${id}';
    (document.head || document.body).appendChild(link);
    link.onload = function() {
      typeof resolve == 'function' && resolve();
    };
    link.onerror = function(error) {
      typeof reject == 'function' && reject(error);
    };
  };
  promise = new Promise(function(resolve, reject) {
    loadCssFunc(resolve, reject);
  });`
}

module.exports = {
  loadJs,
  loadCss
}
