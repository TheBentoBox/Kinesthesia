"use strict";

// IIFE for entire game
(function() {

// web socket to use
var socket;

// game canvas and context
var canvas;
var canvasPos;
var ctx;

// game/server feedback box
var msgBox;

//{ GAME VARS
// size constants
var playerRad = 4;
var gemRad = 15;
var goalWidth = 100;

// Shorthand for Matter components
var Engine, World, Bodies;
// Engine instance to run game
var engine;

// info about this player
var player = {
	name: "",
	side: 0,
	pos: {
		x: -100,
		y: -100
	},
	grabbed: 0,
	score: 0
};

// info about opponent
var opponent = {
	name: "",
	side: 0,
	pos: {
		x: -100,
		y: -100
	},
	grabbed: 0,
	score: 0
};

// gems on the field
var gems = [];
//} GAME VARS

// FUNCTION: clamp value between min and max
function clamp(value, min, max) {
	return Math.max(min, Math.min(value, max));
}

// FUNCTION: connect socket and setup callbacks
function setupSocket() {
	// grab and connect socket
	socket = io.connect();
	
	// callback for server messages
	socket.on("msg", function(data) {
		msgBox.innerHTML = data.msg;
	});
	
	// callback for user connection
	socket.on("connect", function(){
		// connection feedback
		msgBox.innerHTML = "Connecting...";
		
		// grab username from input and send to server
		player.name = document.querySelector("#usernameInput").value;
		
		// generate generic username if none is input
		if (!player.name || player.name === "") {
			player.name = "Player" + Math.floor(Math.random()*1000);
		}
		
		socket.emit("join", { name: player.name });
	});
	
	// Callback for successful join
	socket.on("joined", function(data) {
		// join feedback
		msgBox.innerHTML = data.msg;
		
		// hide connection form
		document.querySelector("#connectForm").style.visibility = "hidden";
	}); 
	
	// Callback for start of play
	socket.on("play", initializeGame);
	
	// Callback for receiving a new physics body from manager
	socket.on("sendOrUpdateBody", function(data) {
		// Create new basic physics object
		var newObj = Bodies.rectangle(data.position.x, data.position.y, data.bounds.max.x - data.bounds.min.x, data.bounds.max.y - data.bounds.min.y);
		delete data.position;
		delete data.bounds;
		
		// Apply all the passed data properties to the new object
		for (var i = 0; i < Object.keys(data).length; ++i) {
			newObj[Object.keys(data)[i]] = data[Object.keys(data)[i]];
		}
		
		// Add the object to the world
		World.add(engine.world, newObj);
	});
	
	// Callback for update from manager
	socket.on("update", function(data) {
		// which object is being updated
		switch (data.object) {
			case "player":
				if (data.pos) {
					player.pos = data.pos;
				}
				if (data.name) {
					player.name = data.name;
				}
				if (data.side) {
					player.side = data.side;
				}
				if (data.grabbed != null) {
					player.grabbed = data.grabbed;
				}
				break;
			case "opponent":
				if (data.pos) {
					opponent.pos = data.pos;
				}
				if (data.name) {
					opponent.name = data.name;
				}
				if (data.side) {
					opponent.side = data.side;
				}
				if(data.grabbed != null) {
					opponent.grabbed = data.grabbed;
				}
				break;
		}
	});
	
	// Callback for scoring a point
	socket.on("score", function(data) {
		// player point
		if (data.side === player.side) {
			msgBox.innerHTML = player.name + " scores a point!";
			player.score++;
		}
		// opponent point
		else {
			msgBox.innerHTML = opponent.name + " scores a point!";
			opponent.score++;
		}
	});
	
	// Callback for game end
	socket.on("end", function(data) {
		// player win
		if (data.side === player.side) {
			msgBox.innerHTML = player.name + " wins!";
		}
		// opponent win
		else if (data.side === opponent.side){
			msgBox.innerHTML = opponent.name + " wins!";
		}
		// tie
		else {
			msgBox.innerHTML = "Tie game!";
		}
	});
	
	// setup canvas mouse down behavior
	/*
	canvas.addEventListener('mousedown', function(e) {
		player.pos.x = clamp(e.x - canvasPos.left, 0, canvas.width);
		player.pos.y = clamp(e.y - canvasPos.top, 0, canvas.height);
		
		socket.emit('click', {pos: player.pos});
	});
	
	// setup canvas mouse up behavior
	document.addEventListener('mouseup', function(e) {
		player.pos.x = clamp(e.x - canvasPos.left, 0, canvas.width);
		player.pos.y = clamp(e.y - canvasPos.top, 0, canvas.height);
						
		socket.emit('release', {pos: player.pos, grabbed: player.grabbed});
	});
	*/
}

// FUNCTION: initializes game space (Matter)
function initializeGame() {
	
	initializeMatter();
	
	// Begin update tick
	setTimeout(update, 100);
}

// FUNCTION: initializes Matter.js game world
function initializeMatter() {
	// create module aliases
	Engine = Matter.Engine;
	World = Matter.World;
	Bodies = Matter.Bodies;
		
	// create an engine
	engine = Engine.create({
		render: {
			element: document.body,
			controller: Matter.RenderPixi
		}
	});
	
	// get reference to game canvas and context
	canvas = document.querySelector("canvas");
	canvasPos = canvas.getBoundingClientRect();
	ctx = canvas.getContext("2d");
	
	// setup canvas mouse movement behavior
	document.addEventListener('mousemove', function(e) {
		player.pos.x = clamp(e.x - canvasPos.left, 0, canvas.width);
		player.pos.y = clamp(e.y - canvasPos.top, 0, canvas.height);
	});
	
	setTimeout(Engine.run, 100, engine);
}

// FUNCTION: update local game instance
function update() {
	// emit player position
	socket.emit("update", {pos: player.pos})
	
	// request next frame
	requestAnimationFrame(update);
}

// FUNCTION: setup page
function init() {
	// grab feedback box
	msgBox = document.querySelector("#msgBox");
	
	// add callback for connect button
	document.querySelector("#connectBut").addEventListener('click', setupSocket);
}

window.onload = init;

})();
// end game IIFE