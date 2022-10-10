# webpack library 插件

## 说明

项目中经常会引入一些比较大的第三方库，最佳实践是采用 webpack import() 按需加载，由于妈妈帮 H5 项目较多，每个项目构建的资源是独立的，项目之间无法通过 http 缓存复用单独打包的第三方库。该插件在构建时捕获 import() 依赖的资源并单独构建发布到 cdn 上，然后配置到 webpack 的 externals 里，最后在浏览器动态引入，以达到复用资源的目的。

备注：`cdn路径地址是按照库的版本号来命名的，为了尽可能地复用缓存，尽量保证项目之间用到的第三方库为同一版本~`

<br/>

## 使用

### 1. webpack 插件配置，以 vue.config.js 为例

```js
const staticLibrary = require('static-library')

chainWebpack: (config) => {
  config.plugin('static-library').use(staticLibrary.StaticLibraryPlugin)
}
```

#### 全部参数

| Key       | 类型   | 描述                                                                                               | 必须 | 默认值 |
| --------- | ------ | -------------------------------------------------------------------------------------------------- | ---- | ------ |
| test      | number | 是否使用测试环境 <br />-1: 自适应 (开发使用测试环境，打包使用正式环境) <br />0: 正式 <br />1: 测试 | 否   | -1     |
| allowList | array  | 白名单，优先级大于黑名单 <br />例如 : ['html2canvas']                                              | 否   | []     |
| blockList | array  | 黑名单                                                                                             | 否   | []     |

<br/>

### 2. 该插件也提供了 cli 命令来构建指定的库到 xxx cdn 上 (可选)

```bash
build-lib [options]
```

#### Options

| Option              | Default | Description                                                                                                       |
| :------------------ | :------ | :---------------------------------------------------------------------------------------------------------------- |
| -V, --version       |         | 当前版本号                                                                                                        |
| -t, --test <test>   | 1       | 1 上传到测试 bucket, 0 上传到正式 bucket                                                                          |
| -b, --babel <babel> | 0       | 1 使用 babel-loader, 0 不使用 babel-loader，如果要使用 babel，需安装 @babel/core、@babel/preset-env、babel-loader |
| -n, --name <name>   |         | package name                                                                                                      |

<br/>