#! /usr/bin/env node
'use strict';

// module dependencies
var program = require('commander'),
	path = require('path'),
	pkg = require(path.join(__dirname, 'package.json')),
	chalk = require('chalk'),
	inquirer = require('inquirer');

// variables
var emphasize = chalk.green.bgBlue;
var authList = [
	{
		type: 'list',
		message: 'Select how you would like to login to your Uber account.',
		name: 'authMethod',
		choices: [
			'Email',
			'Facebook'
		]
	}
];
var questions = [
	{
		type: 'input',
		name: 'email',
		message: 'Please enter login email address.'
	}, 
	{
		type: 'password',
		name: 'password',
		message: 'Please enter your password.'
	}
];

program
	.version(pkg.version)
	.option('-t, --type <type>', 'Type of car you\'d like to request. ' + emphasize('Options: x, taxi, select, black'))
	.option('-s, --size <size>', 'Size of car you\'d like to request. ' + emphasize('Options: x or xl'))
	.option('-d, --destination <dest>', 'Destination address. ' + emphasize('Make sure it\'s enclosed by ""!'))
	.parse(process.argv);

inquirer.prompt(authList, function(answer) {
	if (answer.authMethod === 'Email') {
		inquirer.prompt(questions, function(answers) {
			console.log(answers);
		})
	}
});