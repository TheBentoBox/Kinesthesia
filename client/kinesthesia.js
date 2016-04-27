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
var IS_HOST = false;
var lastClick = {};

// used to control frames in which resting objects are emitted
// resting objects are occasionally forcibly emitted at times based on the frame they fall asleep
var globalIteration = 0;

// Shorthand for Matter components
var Engine, World, Bodies, Body;
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
	
	
	
	// Listens for notifaction from the server that we're the host of the game
	socket.on("notifyHost", function() {
		IS_HOST = true;
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
	
	// Removes all bodies from the game world
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
			switch(data.label) {
				case "Circle Body":
						objToMakeOrUpdate = Bodies.circle(data.position.x, data.position.y, data.circleRadius);
						break;
				default:
						objToMakeOrUpdate = Bodies.rectangle(data.position.x, data.position.y, data.bounds.max.x - data.bounds.min.x, data.bounds.max.y - data.bounds.min.y);
						break;
			}
			
			Matter.Body.set(objToMakeOrUpdate, data);
			
			// force some variables to be sets
			objToMakeOrUpdate.id = data.id;
			objToMakeOrUpdate.atRest = -1;
			objToMakeOrUpdate.atRestCount = 0;
			
			// since it's new, we need to add it to the world
			World.add(engine.world, objToMakeOrUpdate);
		}
		else if (data.time > objToMakeOrUpdate.time) {
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
	
	// Sets up matter world and input callbacks for using abilities
	initializeMatter();
	initializeInput();
	
	// The host starts up the world and begins an update loop
	if (IS_HOST) {
		setupWorld();
		setInterval(emitBodies, 1000/10);
	}
	
	// Begin update tick
	setTimeout(update, 100);
}

// FUNCTION: initializes Matter.js game world
function initializeMatter() {
	// create module aliases
	Engine = Matter.Engine;
	World = Matter.World;
	Bodies = Matter.Bodies;
	Body = Matter.Body;
		
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
				showAngleIndicator: true,
			}
		}
	});
	//engine.enableSleeping = true;
	
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
		
		lastClick = { x: player.pos.x, y: player.pos.y };
	});
	
	// setup canvas mouse up behavior
	document.addEventListener('mouseup', function(e) {
		player.pos.x = clamp(e.x - canvasPos.left, 0, canvas.width);
		player.pos.y = clamp(e.y - canvasPos.top, 0, canvas.height);
						
		// make sure lastClick has been declared, otherwise declare and bail out
		if (lastClick == undefined) {
			lastClick = player.pos;
			return;
		}
		
		var newBody = Bodies.circle(lastClick.x, lastClick.y, gemRad);
		var vel = {
				x: Math.min(25, Math.abs(lastClick.x - player.pos.x)) * Math.sign(lastClick.x - player.pos.x),
				y: Math.min(25, Math.abs(lastClick.y - player.pos.y)) * Math.sign(lastClick.y - player.pos.y)
			};
			
		Body.setVelocity(newBody, vel);
		add(newBody);
	});
}

// INITAL GAME SETUP: sets up starting world objects
function setupWorld() {
	
	var ground = Bodies.rectangle(canvas.width/2, canvas.height + 50, canvas.width*1.5, 140, { isStatic: true, render: { fillStyle: "#000" }});
	var p1Wall = Bodies.rectangle(150, canvas.height - 170, 20, 300, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: "#D6861A" }});
	var p2Wall = Bodies.rectangle(canvas.width - 150, canvas.height - 170, 20, 300, { isStatic: true, render: { fillStyle: "#000000", strokeStyle: "#600960" }});
	add (ground);
	add (p1Wall);
	add (p2Wall);
		
	for (var i = 0; i < 5; i++) {
		var newGem = Bodies.rectangle(
			(Math.random() * canvas.width),
			(Math.random() * canvas.height/2),
			gemRad,
			gemRad
		);
		
		add(newGem);
	}
}

// Process a Matter body and returns a slimmed down version of it
function processBody(physBody) {
	return {
		label: physBody.label,
		angle: physBody.angle,
		bounds: physBody.bounds,
		id: physBody.id,
		position: physBody.position,
		velocity: physBody.velocity,
		render: physBody.render,
		isStatic: physBody.isStatic,
		circleRadius: physBody.circleRadius,
		time: new Date().getTime()
	}
}

// Adds an object to the world, immediately emitting it to the other user
function add(obj) {
	socket.emit(
		"requestAddBody",
		processBody(obj)
	);
}

// Emits all bodies in the world
function emitBodies() {
	
	for (var i = 0; i < engine.world.bodies.length; ++i) {
		
		// Update whether or not the object is at rest
		// We use our own rest system so the physics continue normally under all circumstances
		// Matter bodies seem to come to rest at 0.2777777777~ speed for some reason.
		if (engine.world.bodies[i].speed < 0.2777778 && engine.world.bodies[i].atRest <= -1) {
			
			++engine.world.bodies[i].atRestCount;
			
			// put it to sleep if it's been at rest long enough
			if (engine.world.bodies[i].atRestCount >= 10) {
				engine.world.bodies[i].atRest = globalIteration;
			}
		}
		// wake resting moving objects back up
		else if (engine.world.bodies[i].speed > 0.2777778 && engine.world.bodies[i].atRest > -1) {
			engine.world.bodies[i].atRest = -1;
			engine.world.bodies[i].atRestCount = 0;
		}
		
		// emit body if it's defined and not at rest
		if (engine.world.bodies[i] != undefined && (engine.world.bodies[i].atRest <= -1 || engine.world.bodies[i].atRest == globalIteration)) {
			
			socket.emit(
				"hostEmitBody",
				processBody(engine.world.bodies[i])
			);
		}
	}
	
	// update global iteration value which is used to control resting bodies
	globalIteration = (globalIteration + 1) % 10;
}
	
// FUNCTION: update local game instance
function update() {
	// emit player position
	socket.emit("update", {pos: player.pos});
	
	// request next frame
	requestAnimationFrame(update);
}

window.onload = setupSocket;

})();
// end game IIFE