'use strict';

const fs = require('fs');

function copy(source, destination, replace = v => v) {
  fs.writeFileSync(
    destination,
    '// Copied using node build.js\n// Do not edit by hand\n\n' + replace(fs.readFileSync(source, 'utf8'))
  );
}

// presets: [require.resolve('babel-preset-react-app')],
// configFile: path.join(__dirname, '../.eslintrc')
// var getClientEnvironment = require('./env');
// var paths = require('./paths');
// require.resolve('./polyfills'),
// require(paths.appPackageJson).homepage
function replacements(src) {
  return src
    .replace(/babel-preset-react-app/g, 'babel-preset-moped')
    .replace(/\.\/polyfills/g, '../lib/config/polyfills.js')
    .replace(/require\(paths\.appPackageJson\)\.homepage/g, 'undefined')
    .replace(/\.\.\/\.eslintrc/g, '../moped-eslint-config/.eslintrc');
}
copy(
  require.resolve('react-scripts/config/webpack.config.dev.js'),
  __dirname + '/react-scripts/webpack.config.dev.js',
  replacements
);
copy(
  require.resolve('react-scripts/config/webpack.config.prod.js'),
  __dirname + '/react-scripts/webpack.config.prod.js',
  replacements
);
copy(
  require.resolve('react-scripts/config/env.js'),
  __dirname + '/react-scripts/env.js'
);
copy(
  require.resolve('react-scripts/config/paths.js'),
  __dirname + '/react-scripts/paths.js',
  src => {
    return src
      .replace(/src\/index\.js/g, 'src/client/index.js')
      .replace(/public/g, 'src/public')
      .replace(/build/g, 'build/frontend');
  }
);
copy(
  require.resolve('react-scripts/scripts/start.js'),
  __dirname + '/react-scripts/start-webpack.js',
  src => {
    // require(paths.appPackageJson).proxy
    return src
      .replace(/\.\.\/config\//g, './')
      .replace(/process\.argv/g, '[]')
      .replace(
        /require\(paths\.appPackageJson\)\.proxy/g,
        'require(\'../lib/config/node-server-location.js\').getServerLocation()'
      )
      // disable the normal fallback approach
      .replace(/openBrowser\((.*)\);/g, (_, location) => {
        return 'exports.WEBPACK_DEV_SERVER_LOCATION = ' + location + ';\n' + _;
      })
      .replace(
        /require\(\'connect-history-api-fallback\'\)/g,
        'function () { return function (req, res, next) { next (); }; }'
      );
  }
);
copy(
  require.resolve('react-scripts/scripts/build.js'),
  __dirname + '/react-scripts/build-webpack.js',
  src => {
    return src
      .replace(/\.\.\/config\//g, './')
      .replace(
        /var publicPath \= config\.output\.publicPath\;/g,
        '\nreturn;'
      );
  }
);
