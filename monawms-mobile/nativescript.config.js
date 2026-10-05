/**
 * NativeScript 工程配置
 * @see https://docs.nativescript.org/webpack
 */
module.exports = {
  id: 'com.monawms.mobile',
  displayName: 'MonaWMS',
  appPath: 'app',
  appResourcesPath: 'App_Resources',
  android: {
    v8Flags: '--expose_gc',
    markingMode: 'none',
    suppressCallJSMethodException: false,
  },
  ios: {
    discardUncaughtJsExceptions: false,
  },
};
