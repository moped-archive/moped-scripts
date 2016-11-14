#!/usr/bin/env node
const script = process.argv[2];

switch (script) {
  case 'build':
    require('../')[script]();
    break;
  default:
    console.log('Unknown script "' + script + '".');
    console.log('Perhaps you need to update moped-scripts?');
    break;
}
