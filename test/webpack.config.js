const path = require('path');
const { StaticLibraryPlugin } = require('../src/index');
module.exports = {
  mode: 'development',
  entry: {
    main: path.resolve(__dirname, './aa.js'),
  },
  devtool: false,
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].js',
  },
  plugins: [
    new StaticLibraryPlugin()
  ],
};
