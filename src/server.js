// requires
var http = require('http');
var fs = require('fs');
var socketio = require('socket.io');
var GameManager = require("./GameManager.js");

// try to use node's port or default to 3000
var port = process.env.PORT || process.env.NODE_PORT || 3000;

// read html page
var index = fs.readFileSync(__dirname + "/../client/client.html");

// current open room number
var roomNum = 1;

// all connected users
var users = {};
var queue = [];

// all running games
var games = [];

// create server and listen to port
var app = http.createServer(onRequest).listen(port);
console.log("Listening on port " + port);

// create websocket server
var io = socketio(app);

// FUNCTION: returns game page on request
function onRequest(request, response) {
	// return page
	response.writeHead(200, {"Content-Type": "text/html"});
	response.write(index);
	
	// close stream
	response.end();
}

// FUNCTION: creates new game room
function createRoom() {
	// create room name
	var name = "room" + roomNum;
	roomNum++;
	
	// add waiting users to new room
	queue[0].room = name;
	queue[1].room = name;
	queue[0].join(name);
	queue[1].join(name);
	
	// notify users of new game
	io.sockets.in(name).emit("msg", {msg: "Opponent connected. Starting the game. Drag the gems into yor base to score."});
	
	// create the new game
	var newGame = new GameManager(io, name, queue[0], queue[1]);
	games.push(newGame);
	
	// clear paired users from queue
	queue.splice(0, 2);
}

// FUNCTION: handle user join
function onJoin(socket) {
	socket.on("join", function(data) {
		// check if username is unique
		if (users[data.name]) {
			socket.emit("msg", { msg: data.name + " is already in use. Try another name." });
			return;
		}
		
		// name socket with username and store in user list and queue
		socket.name = data.name;
		users[data.name] = socket;
		queue.push(socket);
		
		// notify user of successful join
		socket.emit("joined", {msg: "Waiting for an opponent..."});
		
		// create a new game if 2 or more players are waiting
		if (queue.length >= 2) {	
			createRoom();
		}
	});
}

// FUNCTION: handle user disconnect
function onDisconnect(socket) {
	socket.on("disconnect", function(data) {
		// delete user
		delete users[socket.name];
		delete queue[socket.name];
	});
}

// send new connections to handlers
io.sockets.on("connection", function(socket) {
	onJoin(socket);
	onDisconnect(socket);
});

console.log("Gem Thief server started");