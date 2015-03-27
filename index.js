#! /usr/bin/env node

var program = require('commander'),
	path = require('path'),
	pkg = require(path.join(__dirname, 'package.json'));

program
	.version(pkg.version)
	.option('-t, --type <type>', 'Type of car you\'d like to request. Options: x, taxi, select, black')
	.option('-s, --size <size>', 'Size of car you\'d like to request. Options: x or xl')
	.option('-d, --destination <dest>', 'Destination address. Make sure it\'s enclosed by ""!')
	.parse(process.argv);

console.log(program.type);
console.log(program.size);
console.log(program.destination);
