const path = require("path");

module.exports = {
  // ... other configuration properties

  resolve: {
    fallback: {
      https: require.resolve("https-browserify"),
      querystring: require.resolve("querystring-es3"),
      fs: false, // or install 'fs' polyfill if needed
      os: require.resolve("os-browserify/browser"),
      stream: require.resolve("stream-browserify"),
      child_process: false, // or install 'child_process' polyfill if needed
      path: require.resolve("path-browserify"),
    },
  },
};
