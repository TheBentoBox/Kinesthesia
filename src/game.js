// requires
var http = require('http');
var path = require('path');
var express = require('express');
var compression = require('compression');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var socketio = require('socket.io');
var RedisStore = require('connect-redis')(session);
var GameManager = require('./GameManager.js');
var url = require('url');
var csrf = require('csurf');

// pull in routes
var router = require('./router.js');

// Get database URL
var dbURL = process.env.MONGOLAB_URI || "mongodb://localhost/AirHockey";

// Connect to the database
var db = mongoose.connect(dbURL, function(err) {
	if (err) {
		console.log("Could not connect to the database.");
		throw err;
	}
});

// Get the redis URL
var redisURL = {
	hostname: 'localhost',
	port: 6379
};

var redisPASS;

// Update redis URL to cloud version if this is running on a server
if (process.env.REDISCLOUD_URL) {
	redisURL = url.parse(process.env.REDISCLOUD_URL);
	redisPASS = redisURL.auth.split(":")[1];
}

// try to use node's port or default to 3000
var port = process.env.PORT || process.env.NODE_PORT || 3000;

// setup express app
var app = express();
app.use('/assets', express.static(path.resolve(__dirname + '/../client')));
app.use(compression());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(session({
	key: "sessionid",
	store: new RedisStore({
		host: redisURL.hostname,
		port: redisURL.port,
		pass: redisPASS
	}),
	secret: 'Kinesthesia',
	resave: true,
	saveUninitialized: true,
	cooke: {
		httpOnly: true
	}
}));
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.use(favicon(__dirname + '/../client/images/favicon.png'));
app.disable('x-powered-by');
app.use(cookieParser());

// set up CSurf
app.use(csrf());
app.use(function(err, req, res, next) {
	if (err.code !== 'EBADCSRFTOKEN') return next(err);
	
	return;
});

// setup http with express app
var server = http.Server(app);

// current open room number
var roomNum = 1;

// all connected users
var queue = [];

// all running games
var games = [];

// pass app to router
router(app);

// create websocket server
var io = socketio(server);

// start listening with app
server.listen(port, function(err) {
	if(err) {
		throw err;
	}
	console.log("Listening on port " + port);
});

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
		
		// check if a socket with this user ID already exists
		var index = -1;
		for (var i = 0; i < queue.length; ++i) {
			if (queue[i].userID === data._id) {
				index = i;
				break;
			}
		}
		
		// don't let people join the queue twice w/multiple tabs 
		if (index == -1) {
			// name socket with username and store in user list and queue
			socket.name = data.username;
			socket.userID = data._id;
			queue.push(socket);
			
			// notify user of successful join
			socket.emit("gameMsg", {msg: "Waiting for an opponent..."});
			
			// create a new game if 2 or more players are waiting
			if (queue.length >= 2) {	
				createRoom();
			}
		}
		else {
			// notify user of failed join
			socket.emit("gameMsg", {msg: "You are already in the user queue."});
		}
	});
}

// FUNCTION: handle user chat msg
function onMessage(socket) {
	socket.on("chatMsg", function(data) {
		socket.broadcast.emit("msg", data);
	});
}

// FUNCTION: handle user data request
function onUsersRequest(socket) {
	socket.on("requestUsers", function(data) {
		// get all sockets
		var connectedSockets = io.sockets.sockets;
		var keys = Object.keys(connectedSockets);
		
		var onlineUsers = [];
		
		// get userdata objects from online sockets
		for (var i = 0; i < keys.length; ++i) {
			var currentSocket = connectedSockets[keys[i]];
			onlineUsers.push(currentSocket.userdata);
		}
		
		socket.emit("userlist", { users: onlineUsers });
	});
}

// FUNCTION: handle user disconnect
function onDisconnect(socket) {
	socket.on("disconnect", function(data) {
		// delete user
		delete queue[socket.name];
	});
}

// FUNCTION: handle user disconnect
function onUnload(socket) {
	socket.on("removeFromQueue", function(data) {
		var index = queue.indexOf(socket);
		
		// delete user
		if (index != -1) {
			queue.splice(index, 1);
		}
	});
}

// FUNCTION: listen for users sending userdata
function onUserdata(socket) {
	socket.on("userdata", function(data) {
		socket.userdata = data;
	});
}

// send new connections to handlers
io.sockets.on("connection", function(socket) {
	onJoin(socket);
	onUsersRequest(socket);
	onDisconnect(socket);
	onMessage(socket);
	onUnload(socket);
	onUserdata(socket);
});

console.log("Kinesthesia server started");