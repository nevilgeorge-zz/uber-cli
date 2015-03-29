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
	async = require('async'),
	geocoder = require('node-geocoder')('google', 'http'),
	geolib = require('geolib');

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
		message: emphasize('Please enter the authorization code that just opened in your browser:')
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
	console.log(authUrl);
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

function findClosestLocation(array, location) {
	var item, temp, l1, l2,
		minItem = array[0],
		minimum = 10000000;
	for (var i = 0; i < array.length; i++) {
		item = array[i];
		l1 = {
			latitude: item.latitude,
			longitude: item.longitude
		};
		l2 = {
			latitude: location.latitude,
			longitude: location.longitude
		};
		temp = geolib.getDistance(l1, l2);
		if (temp < minimum) {
			minimum = temp;
			minItem = item;
		}
	}
	return minItem;
}

program
	.version(pkg.version)
	.option('-t, --type <type>', 'Type of car you\'d like to request. ' + emphasize('Options: x, taxi, select, black'))
	.option('-s, --size <size>', 'Size of car you\'d like to request. ' + emphasize('Options: x or xl'))
	.option('-d, --destination <dest>', 'Destination address. ' + emphasize('Make sure it\'s enclosed by ""!'))
	.parse(process.argv);

var location;
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
				longitude: strings[1],
				city: result.city,
				state: result.region
			};
			location = position;
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
			message: 'The following cars are available in your area. Please select one:',
			choices: choices
		}
		], function(answer) {
			var index = choices.indexOf(answer.vehicle);
			var productID = vehicles.products[index].product_id;
			callback(null, productID, answer.vehicle);
		});
	},
	// ask for destination address
	function(productID, vehicle, callback) {
		var car = vehicle.split('  -  ')[0];
		inquirer.prompt([
			{
				type: 'input',
				name: 'destination',
				message: 'Please enter the destination you\'d like your ' + car + ' to take you to:'
			}
		], function(answer) {
			callback(null, answer.destination);
		});
	},
	// find coordinates of address
	function(destination, callback) {
		geocoder.geocode(destination, function(err, res) {
			if (err) {
				console.log(err);
				callback(null, null);
			} else {
				if (res.length === 1) {
					callback(null, res[0])
				} else {
					var correctLocation = findClosestLocation(res, location);
					callback(null, correctLocation);
				}
			}
		});
	},
	function(loc, callback) {
		console.log(loc);
	}
], function(err, result) {
	console.log(result);
});