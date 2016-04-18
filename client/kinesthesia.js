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

	// Connect to socket.io
	// The io variable is a global var from the socket.io script above
	socket = (socket || io.connect());
	socket.emit("userdata", userdata);
	
	// Listener for user connection event
	socket.on("connect", function(){
		console.log("Connecting...");
		
		socket.emit("join", userdata);
		socket.emit("sendId", { id: userdata._id });
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
	
	socket.on("clearBodies", function(data) {
		World.clear(engine.world, true);
	})
	
	// Callback for receiving a new physics body from manager
	socket.on("sendOrUpdateBody", function(data) {
		
		// Find the object in the world to update
		var objToMakeOrUpdate = Matter.Composite.get(engine.world, data.id, "body");
		var objectIsNew = (objToMakeOrUpdate == null);
		
		// if we didn't find it, then this object is new - make a new one to add its properties to
		if (objectIsNew) {
			// we need to manually create it with the proper position and bounds
			// this makes matter correctly calculate its weight, volume, etc. phys properties
			objToMakeOrUpdate = Bodies.rectangle(data.position.x, data.position.y, data.bounds.max.x - data.bounds.min.x, data.bounds.max.y - data.bounds.min.y);
			delete data.bounds;
			Matter.Body.set(objToMakeOrUpdate, data);
			
			objToMakeOrUpdate.id = data.id;
			
			// since it's new, we need to add it to the world
			World.add(engine.world, objToMakeOrUpdate);
		}
		else {
			Matter.Body.set(objToMakeOrUpdate, data);
		}
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
	
	// Listen for game completion events, which let us know the game
	// is over and whether we won or lost. Updates statistics.
	socket.on("gameComplete", function(data) {
		data._csrf = $("#token").val();
		sendAjax("/updateStats", data);
	});
}

// FUNCTION: initializes game space (Matter)
function initializeGame() {
	
	initializeMatter();
	initializeInput();
	
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
			element: document.querySelector('#canvasContainer'),
			controller: Matter.RenderPixi,
			options: {
				width: 1200,
				height: 640,
				wireframes: false,
				background: "#222",
				enabled: false,
				showDebug: true,
				showBroadphase: true,
				showBounds: true,
				showVelocity: true,
				showCollisions: true,
				showAxes: true,
				showPositions: true,
				showAngleIndicator: true,
				showIds: true,
				showShadows: true
			}
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
	
	Matter.Runner.run(engine);
}

// FUNCTION: sets up user input for using abilities
function initializeInput() {
	// setup canvas mouse down behavior
	canvas.addEventListener('mousedown', function(e) {
		player.pos.x = clamp(e.x - canvasPos.left, 0, canvas.width);
		player.pos.y = clamp(e.y - canvasPos.top, 0, canvas.height);
		
		//for (var i = 0; i < engine.world.bodies.length; ++i) {
		//	if ((player.pos.x - engine.world.bodies[i].position.x < 5) && (player.pos.y - engine.world.bodies[i].position.y < 5)) {
		//		console.log(engine.world.bodies[i]);
		//	}
		//}
		
		socket.emit('click', {pos: player.pos});
	});
	
	// setup canvas mouse up behavior
	document.addEventListener('mouseup', function(e) {
		player.pos.x = clamp(e.x - canvasPos.left, 0, canvas.width);
		player.pos.y = clamp(e.y - canvasPos.top, 0, canvas.height);
						
		socket.emit('release', {pos: player.pos, grabbed: player.grabbed});
	});
}

// FUNCTION: update local game instance
function update() {
	// emit player position
	socket.emit("update", {pos: player.pos})
	
	for (var i = 0; i < engine.world.bodies.length; ++i) {
		ctx.fillStyle="white";
		ctx.fillText(engine.world.bodies[i].angularVelocity, engine.world.bodies.position.x, engine.world.bodies.position.y);
	}
	
	// request next frame
	requestAnimationFrame(update);
}

window.onload = setupSocket;

})();
// end game IIFE