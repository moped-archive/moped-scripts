import {writeFileSync, readFileSync} from 'fs';
import ConvertAnsi from 'ansi-to-html';
import Promise from 'promise';
import {sync as mkdirp} from 'mkdirp';
import {sync as rimraf} from 'rimraf';
import {transformFileSync} from 'babel-core';
import {sync as lsr} from 'lsr';
import {setServerLocation} from './config/node-server-location';
const convertAnsi = new ConvertAnsi({
  fg: '#000',
  bg: '#FFF',
  newline: true,
  escapeXML: true,
});

export function register() {
  process.env.NODE_ENV = 'development';
  // Load environment variables from .env file. Suppress warnings using silent
  // if this file is missing. dotenv will never modify any environment variables
  // that have already been set.
  // https://github.com/motdotla/dotenv
  require('dotenv').config({silent: true});
  require('babel-register')({
    ignore(filename) {
      return !(
        /(\/|\\)src(\/|\\)server(\/|\\)/.test(filename) && !/node_modules/.test(filename)
      );
    },
    babelrc: false,
    presets: [require.resolve('babel-preset-moped')],
  });
}
export function loadServerLive(filename) {
  // eslint-disable-next-line
  let requestHandler = (req, res, next) => res.send('Not started yet');
  require('babel-live')(filename, {
    // TODO: offer memoised versions of common database connection libraries
  }, {
    highlightCode: !/^win/.test(process.platform),
  },
  v => {
    requestHandler = v.default;
  },
  err => {
    // error is already a string
    console.error(err);
    requestHandler = (req, res, next) => {
      res.send(
        `
          There was a build error:
          <pre>${convertAnsi.toHtml(global.lastError)}</pre>
        `,
      );
    };
  });
  return (req, res, next) => {
    // always call the latest requestHandler, which gets updated on each change
    requestHandler(req, res, next);
  };
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
  process.env.NODE_ENV = 'production';
  rimraf('./build');
  require('../react-scripts/build-webpack');
  lsr('./src/server').forEach(entry => {
    if (entry.isDirectory()) {
      mkdirp('./build/backend' + entry.path.substr(1));
    } else if (entry.isFile()) {
      if (/\.js$/.test(entry.path)) {
        const code = transformFileSync(
          entry.fullPath,
          {
            babelrc: false,
            presets: [require.resolve('babel-preset-moped')],
          },
        ).code;
        writeFileSync(
          './build/backend' + entry.path.substr(1),
          code,
        );
      } else {
        writeFileSync(
          './build/backend' + entry.path.substr(1),
          readFileSync(
            entry.fullPath,
          ),
        );
      }
    }
  });
}
