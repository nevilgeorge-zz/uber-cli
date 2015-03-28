#! /usr/bin/env node
'use strict';

// module dependencies
var program = require('commander'),
	path = require('path'),
	pkg = require(path.join(__dirname, 'package.json')),
	chalk = require('chalk'),
	inquirer = require('inquirer'),
	fs = require('fs'),
	request = require('request'),
	Uber = require('node-uber'),
	open = require('open'),
	_ = require('underscore'),
	auth = require(path.join(__dirname, 'auth.js'));

// variables
var emphasize = chalk.green.bgBlue;
var loginList = [
	{
		type: 'list',
		message: emphasize('Select how you would like to login to your Uber account.'),
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
		message: emphasize('Please enter login email address:')
	}, 
	{
		type: 'password',
		name: 'password',
		message: emphasize('Please enter your password:')
	}
];
var authList = [
	{
		type: 'input',
		name: 'authCode',
		message: emphasize('Please enter your authorization code:')
	}
];

var uber = new Uber(auth);

// functions
// check whether uberconfig file exists 
function doesFileExist() {
	return fs.existsSync('.uberconfig.json');
}

// read JSON information from uberconfig file
function readFromFile() {
	fs.readFile('.uberconfig.json', {encoding: 'utf8'}, function(err, data) {
		var contents = JSON.parse(data);
		console.log(contents);
	});
}

// write answers to JSON file
function writeToFile(answers) {
	fs.writeFile('.uberconfig.json', JSON.stringify(answers), function(err) {
		if (err) {
			throw err;
		}
	});
}

// handle authentication using node-uber API wrapper
function handleAuthentication() {
	var authUrl = uber.getAuthorizeUrl(['request']);
	open(authUrl);
}

function handleAuthorization(code, callback) {
	uber.authorization({ authorization_code: code}, function(err, access_token, refresh_token) {
		if (err) {
			console.log(err);
		} else {
			var result = {
				access: access_token,
				refresh: refresh_token
			};
			callback(result);
		}
	});
}

// uber.authorization(['profile'], function(data) {
// 	// console.log(data);
// });

program
	.version(pkg.version)
	.option('-t, --type <type>', 'Type of car you\'d like to request. ' + emphasize('Options: x, taxi, select, black'))
	.option('-s, --size <size>', 'Size of car you\'d like to request. ' + emphasize('Options: x or xl'))
	.option('-d, --destination <dest>', 'Destination address. ' + emphasize('Make sure it\'s enclosed by ""!'))
	.parse(process.argv);

if (!doesFileExist()) {
	inquirer.prompt(loginList, function(answer) {
		if (answer.authMethod === 'Email') {
			inquirer.prompt(questions, function(answers) {
				var obj = answers;
				handleAuthentication();
				inquirer.prompt(authList, function(answer) {
					var tokens = handleAuthorization(answer.authCode, function(result) {
						var objToWrite = _.extend(obj, result);
						console.log(objToWrite);
						writeToFile(objToWrite);
					});
				});
			});
		}
	});
} else {
	readFromFile();
}

