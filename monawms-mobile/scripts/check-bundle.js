const nsWebpack = require('@nativescript/webpack');
const webpack = require('webpack');
const env = {
  platform: 'android',
  production: process.argv[2] === 'prod',
  sourceMap: false,
  appPath: 'app',
  appResourcesPath: 'App_Resources',
};
nsWebpack.init(env);
nsWebpack.useConfig('vue');
const config = nsWebpack.resolveConfig();
config.output = config.output || {};
config.output.path = require('path').join(process.cwd(), '.bundle-check');
const compiler = webpack(config);
compiler.run((err, stats) => {
  if (err) { console.error('WEBPACK FATAL:', err); process.exit(1); }
  console.log(stats.toString({ colors: false, modules: false, chunks: false, assets: true, errors: true, warnings: true, errorDetails: false }));
  compiler.close(()=>{});
  process.exit(stats.hasErrors() ? 2 : 0);
});
