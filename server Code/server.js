/*
 * Server.js
 * 
 * The main portion of this project. Contains all the defined routes for express,
 * rules for the websockets, and rules for the MQTT broker.
 * 
 * Refer to the portions surrounded by --- for points of interest
 */
var express   = require('express'),
	app       = express();
var pug       = require('pug');
var sockets   = require('socket.io');
var path      = require('path');
var threshold = 4;

/*-------------CONFIG BLOCK------------------
Input the
beacon ID
board MAC address
that are located at each corresponding location
*/

var matherly_beacon = "";
var matherly_board = "";

var norman_beacon = "";
var norman_board = "";

var carson_beacon = "";
var carson_board = ""; 

var little_beacon = "";
var little_board = ""; 

//--------------------------------------------

var matherly_topic = "Matherly";
var matherlyCounter = 0;

var norman_topic = "Norman";
var normanCounter = 0;

var carson_topic = "Carson";
var carsonCounter = 0;

var little_topic = "Little";
var littleCounter = 0;


var conf      = require(path.join(__dirname, 'config'));
var internals = require(path.join(__dirname, 'internals'));

// -- Setup the application
setupExpress();
setupSocket();


// -- Socket Handler
// Here is where you should handle socket/mqtt events
// The mqtt object should allow you to interface with the MQTT broker through 
// events. Refer to the documentation for more info 
// -> https://github.com/mcollina/mosca/wiki/Mosca-basic-usage
// ----------------------------------------------------------------------------
function red_light_on(board_topic)
{
	var message = { topic: board_topic, payload: 'red', qos: 0 , retain: true };

	internals.mosca.publish(message, function() { console.log('done!');});

}




function socket_handler(socket, mqtt) {
	// Called when a client connects

	mqtt.on('clientConnected', client => {
		socket.emit('debug', {
			type: 'CLIENT', msg: 'New client connected: ' + client.id
		});
	
	});

	// Called when a client disconnects
	mqtt.on('clientDisconnected', client => {
		socket.emit('debug', {
			type: 'CLIENT', msg: 'Client "' + client.id + '" has disconnected'
		});
	});


	
	// Called when a client publishes data
	mqtt.on('published', (data, client) => {
		if (!client) return;
		var beacon = data['payload'];
		//var beacon = JSON.stringify(data);

		/*socket.emit('debug', {
			type: 'CLIENT', msg: 'Client "' + JSON.stringfy(data) + '" has disconnected'
		});*/
		//data.type
		//var id = JSON.stringify(data);


		if ((beacon == matherly_beacon || client.id == matherly_board) && matherlyCounter < threshold) 
		{
			matherlyCounter++;
			socket.emit('debug',{ type: 'PUBLISH', location: 'm', inc: matherlyCounter ,  msg: 'Client "' + client.id + '" publisher "' + JSON.stringify(data) + '"'});
		} 

		else if ((beacon == norman_beacon || client.id == norman_board) && normanCounter < threshold) 
		{
			normanCounter++;
			socket.emit('debug',{ type: 'PUBLISH', location: 'n', inc: normanCounter , thresh: threshold , msg: 'Client "' + client.id + '" publisher "' + JSON.stringify(data) + '"'});
		} 

		else if ((beacon == carson_beacon || client.id == carson_board) && carsonCounter < threshold) 
		{
			carsonCounter++;
			socket.emit('debug',{ type: 'PUBLISH', location: 'c', inc: carsonCounter ,  msg: 'Client "' + client.id + '" publisher "' + JSON.stringify(data) + '"'});
		} 

		else if ((beacon == little_beacon || client.id == little_board) && littleCounter < threshold) 
		{
			littleCounter++;
			socket.emit('debug',{ type: 'PUBLISH', location: 'l', inc: littleCounter ,  msg: 'Client "' + client.id + '" publisher "' + JSON.stringify(data) + '"'});
		} 


		if(littleCounter==threshold) 
		{
			socket.emit('debug',{ type: 'PUBLISH', inc: threshold, msg: "Threshold reached"});
			red_light_on(little_topic);
		}
		if(matherlyCounter==threshold) 
		{
			socket.emit('debug',{ type: 'PUBLISH', inc: threshold, msg: "Threshold reached"});
			red_light_on(matherly_topic);
		}
		if(normanCounter==threshold) 
		{
			socket.emit('debug',{ type: 'PUBLISH', inc: threshold, msg: "Threshold reached"});
			red_light_on(norman_topic);
		}
		if(carsonCounter==threshold) 
		{
			socket.emit('debug',{ type: 'PUBLISH', inc: threshold, msg: "Threshold reached"});
			red_light_on(carson_topic);
		}

	});


	// Called when a client subscribes
	mqtt.on('subscribed', (topic, client) => {
		if (!client) return;

		socket.emit('debug', {
			type: 'SUBSCRIBE',
			msg: 'Client "' + client.id + '" subscribed to "' + topic + '"'
		});
	});

	// Called when a client unsubscribes
	mqtt.on('unsubscribed', (topic, client) => {
		if (!client) return;

		socket.emit('debug', { type: 'SUBSCRIBE', msg: 'Client "' + client.id + '" unsubscribed from "' + topic + '"'});
	});
}
// ----------------------------------------------------------------------------


// Helper functions
function setupExpress() {
	app.set('view engine', 'pug'); // Set express to use pug for rendering HTML

	// Setup the 'public' folder to be statically accessable
	var publicDir = path.join(__dirname, 'public');
	app.use(express.static(publicDir));

	// Setup the paths (Insert any other needed paths here)
	// ------------------------------------------------------------------------
	// Home page
	app.get('/', (req, res) => {
		res.render('index', {title: 'MQTT Tracker'});
	});

	// Basic 404 Page
	app.use((req, res, next) => {
		var err = {
			stack: {},
			status: 404,
			message: "Error 404: Page Not Found '" + req.path + "'"
		};

		// Pass the error to the error handler below
		next(err);
	});

	// Error handler
	app.use((err, req, res, next) => {
		console.log("Error found: ", err);
		res.status(err.status || 500);

		res.render('error', {title: 'Error', error: err.message});
	});
	// ------------------------------------------------------------------------

	// Handle killing the server
	process.on('SIGINT', () => {
		internals.stop();
		process.kill(process.pid);
	});
}

function setupSocket() {
	var server = require('http').createServer(app);
	var io = sockets(server);

	// Setup the internals
	internals.start(mqtt => {
		io.on('connection', socket => {
			socket_handler(socket, mqtt)
		});
	});

	server.listen(conf.PORT, conf.HOST, () => { 
		console.log("Listening on: " + conf.HOST + ":" + conf.PORT);
	});
}
