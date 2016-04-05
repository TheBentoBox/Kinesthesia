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
		console.log(data);
		
		// Create object with the data
		var newObj = Bodies.rectangle(0, 0, 0, 0, data);
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
}

// FUNCTION: initializes game space (Matter)
function initializeGame() {
	
	initializeMatter();
	
	// Begin update tick
	update();
}

// FUNCTION: initializes Matter.js game world
function initializeMatter() {
	// create module aliases
	Engine = Matter.Engine;
	World = Matter.World;
	Bodies = Matter.Bodies;
		
	// create an engine
	engine = Engine.create();
}

// FUNCTION: update local game instance
function update() {
	// clear screen
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	// fill background
	ctx.fillStyle = "#eee";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	// draw goals
	ctx.fillStyle = "#0b0";
	ctx.fillRect(0, 0, goalWidth, canvas.height);
	
	ctx.fillStyle = "#b00";
	ctx.fillRect(canvas.width - goalWidth, 0, goalWidth, canvas.height);
	
	// draw all gems
	ctx.fillStyle = "#00d";
	for (var i = 0; i < gems.length; i++) {
		ctx.beginPath();
		ctx.arc(gems[i].x, gems[i].y, gemRad, 0, Math.PI*2);
		ctx.fill();
	}
	
	// draw grabbed gems
	if (player.grabbed == 1) {
		ctx.fillStyle = "#00e";
		ctx.beginPath();
		ctx.arc(player.pos.x, player.pos.y, gemRad, 0, Math.PI*2);
		ctx.fill();
	}
	
	if (opponent.grabbed == 1) {
		ctx.fillStyle = "#00e";
		ctx.beginPath();
		ctx.arc(opponent.pos.x, opponent.pos.y, gemRad, 0, Math.PI*2);
		ctx.fill();
	}
	
	// draw player cursors and scores
	if (player.side == 0) {
		ctx.fillStyle = "#0e0"
		ctx.beginPath();
		ctx.arc(player.pos.x, player.pos.y, playerRad, 0, Math.PI*2);
		ctx.fill();
		
		ctx.fillStyle = "#e00"
		ctx.beginPath();
		ctx.arc(opponent.pos.x, opponent.pos.y, playerRad, 0, Math.PI*2);
		ctx.fill();
	
		ctx.fillStyle = "#000"
		ctx.textAlign = "left";
		ctx.fillText(player.name + ": " + player.score, 5, 25);
		ctx.textAlign = "right";
		ctx.fillText(opponent.score + " :" + opponent.name, canvas.width - 5, 25);
	}
	else {
		ctx.fillStyle = "#0e0"
		ctx.beginPath();
		ctx.arc(opponent.pos.x, opponent.pos.y, playerRad, 0, Math.PI*2);
		ctx.fill();
		
		ctx.fillStyle = "#e00"
		ctx.beginPath();
		ctx.arc(player.pos.x, player.pos.y, playerRad, 0, Math.PI*2);
		ctx.fill();
	
		ctx.fillStyle = "#000"
		ctx.textAlign = "left";
		ctx.fillText(opponent.name + ": " + opponent.score, 5, 25);
		ctx.textAlign = "right";
		ctx.fillText(player.score + " :" + player.name, canvas.width - 5, 25);
	}
	
	// emit player position
	socket.emit("update", {pos: player.pos})
	
	// request next frame
	requestAnimationFrame(update);
}

// FUNCTION: setup page
function init() {
	// get reference to game canvas and context
	canvas = document.querySelector("#gameCanvas");
	canvasPos = canvas.getBoundingClientRect();
	ctx = canvas.getContext("2d");
	
	// grab feedback box
	msgBox = document.querySelector("#msgBox");
	
	// add callback for connect button
	document.querySelector("#connectBut").addEventListener('click', setupSocket);
	
	// setup canvas mouse movement behavior
	document.addEventListener('mousemove', function(e) {
		player.pos.x = clamp(e.x - canvasPos.left, 0, canvas.width);
		player.pos.y = clamp(e.y - canvasPos.top, 0, canvas.height);
	});
	
	// setup canvas text
	ctx.font = "16pt helvetica";
}

window.onload = init;

})();
// end game IIFE