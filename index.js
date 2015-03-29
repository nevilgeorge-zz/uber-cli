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
	auth = require(path.join(__dirname, 'auth.js')),
	async = require('async');

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

function requestRide() {
	request.get('https://sandbox-api.uber.com/v1/requests?latitude=42.0586&longitude=-87.6845')
}

program
	.version(pkg.version)
	.option('-t, --type <type>', 'Type of car you\'d like to request. ' + emphasize('Options: x, taxi, select, black'))
	.option('-s, --size <size>', 'Size of car you\'d like to request. ' + emphasize('Options: x or xl'))
	.option('-d, --destination <dest>', 'Destination address. ' + emphasize('Make sure it\'s enclosed by ""!'))
	.parse(process.argv);

async.waterfall([
	// check for uberconfig file and ask for email address if no file exists
	function(callback) {
		if (!doesFileExist()) {
			inquirer.prompt(questions, function(answers) {
				var details = answers;
				callback(null, details);
			})
		} else {
			callback(null, null);
		}
	},
	// sends authentication code and also obtains access token and refresh token
	function(details, callback) {
		if (details) {
			handleAuthentication();
			inquirer.prompt(authList, function(answer) {
				handleAuthorization(answer.authCode, function(tokens) {
					var result = _.extend(details, tokens);
					writeToFile(result);
					callback(null);
				});
			});
		} else {
			callback(null);
		}
	},
	// get location coordinates
	function(callback) {
		request.get('http://ipinfo.io', function(err, response, data) {
			var result = JSON.parse(data);
			var strings = result.loc.split(',');
			var position = {
				latitude: strings[0],
				longitude: strings[1]
			};
			callback(null, position);
		});
	},
	// get products available at location
	function(position, callback) {
		var options = {
			url: 'https://api.uber.com/v1/products?latitude=37.7759792&longitude=-122.41823',
			headers: {
				'Authorization': 'Token ' + auth.server_token
			}
		};
		request(options, function(error, response, body) {
			var results = JSON.parse(body);
			callback(null, results);
		});
	},
	// parse products into choices
	function(vehicles, callback) {
		var string, item,
			choices = [];
		for (var i = 0; i < vehicles.products.length; i++) {
			item = vehicles.products[i];
			string = item.display_name + '  -  ' + 'Seats ' + item.capacity + ' people' +
				'  -  ' + item.description;
			choices.push(string);
			//choices.push(new inquirer.Separator());
		}
		callback(null, choices, vehicles);
	},
	// display choices and wait for user to select
	function(choices, vehicles, callback) {
		inquirer.prompt([
		{
			type: 'list',
			name: 'vehicle',
			message: 'The following cars are in your area. Please select one:',
			choices: choices
		}
		], function(answer) {
			var index = choices.indexOf(answer.vehicle);
			var productID = vehicles.products[index].product_id;
			callback(null, productID);
		});
	},
	// confirm request of selected car
	function(productID, callback) {
		console.log(productID);
	}
], function(err, result) {
	console.log(result);
});