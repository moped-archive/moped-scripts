import Promise from 'promise';
import {setServerLocation} from './config/node-server-location';

export function register() {
  process.env.NODE_ENV = 'development';
  // Load environment variables from .env file. Suppress warnings using silent
  // if this file is missing. dotenv will never modify any environment variables
  // that have already been set.
  // https://github.com/motdotla/dotenv
  require('dotenv').config({silent: true});
  require('babel-register')({
    ignore(filename) {
      return !(/(\/|\\)src(\/|\\)server(\/|\\)/.test(filename) && !/node_modules/.test(filename));
    },
    babelrc: false,
    presets: [require.resolve('babel-preset-moped')],
  });
}

export function start(server) {
  const detectPort = require('detect-port');
  const createProxy = require('http-proxy-middleware');
  Promise.resolve(detectPort(3001)).done(port => {
    let webpackResult = null;
    let proxy = null;
    function fallbackFn(req, res, next) {
      if (!(webpackResult && webpackResult.WEBPACK_DEV_SERVER_LOCATION)) {
        return setTimeout(() => fallbackFn(req, res, next), 500);
      }
      if (!proxy) {
        proxy = createProxy({
          target: webpackResult.WEBPACK_DEV_SERVER_LOCATION,
          pathRewrite: {
            '.*': '/',
          },
        });
      }
      if (req.method === 'GET') {
        return proxy(req, res, next);
      } else {
        return next();
      }
    }
    server.use(fallbackFn);
    server.listen(port);
    setServerLocation('http://localhost:' + port);
    webpackResult = require('../react-scripts/start-webpack');
  });
}
export function build() {
  require('../react-scripts/build-webpack');
}
