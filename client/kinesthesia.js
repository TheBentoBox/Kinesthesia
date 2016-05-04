"use strict";
// if game exists use the existing copy
// else create a new object literal
var game = game || {};

// IIFE for entire game
game.main = (function() {

// web socket to use
var socket;

// game canvas and context
var canvas;
var canvasPos;
var ctx;
var windowManager = game.windowManager; // reference to the engine's window manager

// game/server feedback box
var msgBox;

//{ GAME VARS
// abilities the player can switch between
var ABILITIES = {
	CANNONBALL: {
		name: "Cannonball",
		src: "iconCannonball"
	},
	GRENADE: {
		name: "Grenade",
		src: "iconGrenade"
	},
	GRAVITY_WELL: {
		name: "Gravity Well",
		src: "iconGravityWell"
	}
};

// size constants
var gemRad = 15;
var IS_HOST = false;
var gameInitialized = false;
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
	currentAbility: ABILITIES['CANNONBALL'],
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
	currentAbility: ABILITIES['CANNONBALL'],
	score: 0
};

//} GAME VARS

// FUNCTION: connect socket and setup callbacks
function setupSocket() {

	// Connect to socket.io
	// The io variable is a global var from the socket.io script above
	socket = (socket || io.connect());
	socket.emit("userdata", userdata);
	
	// Callback for start of play
	socket.on("play", initializeGame);
	
	// Listener for user connection event
	socket.on("connect", function(){
		console.log("Connecting...");
		
		socket.emit("join", userdata);
		socket.emit("sendId", { id: userdata._id });
	});
	
	// Listens for notifaction from the server that we're the host of the game
	socket.on("notifyHost", function() {
		IS_HOST = true;
		
		if (gameInitialized) {
			setupWorld();
			setInterval(emitBodies, 1000/10);
		}
	});
	
	// Callback for successful join
	socket.on("joined", function(data) {
		// join feedback
		msgBox.innerHTML = data.msg;
		
		// hide connection form
		document.querySelector("#connectForm").style.visibility = "hidden";
	}); 
	
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
			objToMakeOrUpdate.time = data.time;
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
	
	// Listen for other user changing their ability
	socket.on("abilityChange", function(data) {
		// We do it this way because they emit their current ability by name.
		// Would emit as whole ability type but the img didn't transfer with it properly.
		for (var key in ABILITIES) {
			if (ABILITIES[key].name == data) {
				opponent.currentAbility = ABILITIES[key];
				break;
			}
		}
		
		windowManager.modifyImage("opponentHUD", "currAbilityImg", "image", { image: opponent.currentAbility.img });
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
	loadAssets();
	initializeMatter();
	initializeInput();
	setupUI();
	
	// The host starts up the world and begins an update loop
	if (IS_HOST && !gameInitialized) {
		setupWorld();
		setInterval(emitBodies, 1000/10);
		gameInitialized = true;
	}
	
	// Begin update tick
	setTimeout(update, 100);
}

// FUNCTION: Loads in some images
function loadAssets() {
	for (var key in ABILITIES) {
		ABILITIES[key].img = new Image();
		ABILITIES[key].img.src = "assets/images/" + ABILITIES[key].src + ".png";
	}
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
		// only accept left clicks here
		if (e.which != 1) return;
		
		e.stopPropagation();
		e.preventDefault();
		
		player.pos.x = clamp(e.x - canvasPos.left, 0, canvas.width);
		player.pos.y = clamp(e.y - canvasPos.top, 0, canvas.height);
		
		lastClick = { x: player.pos.x, y: player.pos.y };
	});
	
	// setup canvas mouse up behavior
	document.addEventListener('mouseup', function(e) {
		// only accept left clicks here
		if (e.which != 1) return;
		
		player.pos.x = clamp(e.x - canvasPos.left, 0, canvas.width);
		player.pos.y = clamp(e.y - canvasPos.top, 0, canvas.height);
						
		// make sure lastClick has been declared, otherwise declare and bail out
		if (lastClick == undefined) {
			lastClick = player.pos;
			return;
		}
		
		// prep the new body
		var newBody = Bodies.circle(lastClick.x, lastClick.y, gemRad);
		var vel = {
				x: Math.min(25, Math.abs(lastClick.x - player.pos.x)) * Math.sign(lastClick.x - player.pos.x),
				y: Math.min(25, Math.abs(lastClick.y - player.pos.y)) * Math.sign(lastClick.y - player.pos.y)
			};
			
		Body.setVelocity(newBody, vel);
		add(newBody);
	});

	// prevent right click menu on canvas
	canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });
	
	// scrolling to change between abilities
	canvas.addEventListener('wheel', function(e) {
		e.preventDefault();
		
		// scroll down - next ability
		if (e.deltaY > 0) {
			player.currentAbility = next(ABILITIES, player.currentAbility);
		}
		// scroll up - previous
		else {
			player.currentAbility = previous(ABILITIES, player.currentAbility);
		}
		
		socket.emit("abilityChange", player.currentAbility.name);
		windowManager.modifyImage("playerHUD", "currAbilityImg", "image", { image: player.currentAbility.img });
	});

	// use of other various keys, e.g. number keys to switch between abilities
	document.addEventListener('keydown', function(e) {
		
		switch (e.keyCode) {
			case KEY.ONE:
			case KEY.NUM_ONE:
			case KEY.Q:
				player.currentAbility = ABILITIES.CANNONBALL;
				break;
				
			case KEY.TWO:
			case KEY.NUM_TWO:
			case KEY.W:
				player.currentAbility = ABILITIES.GRENADE;
				break;
				
			case KEY.THREE:
			case KEY.NUM_THREE:
			case KEY.E:
				player.currentAbility = ABILITIES.GRAVITY_WELL;
				break;
		}
				
		socket.emit("abilityChange", player.currentAbility.name);
		windowManager.modifyImage("playerHUD", "currAbilityImg", "image", { image: player.currentAbility.img });
	});
}

// INITIAL UI SETUP
function setupUI() {
	// PLAYER INFO HUD // {
	windowManager.makeUI("playerHUD", (player.side * canvas.width) - (player.side * 100), 0, 100, 50);
	windowManager.makeText("playerHUD", "username", 15 , 15, canvas.width/10, canvas.height/5, userdata.username, "12pt 'Roboto'", "white");
	windowManager.makeImage("playerHUD", "currAbilityImg", 50, 0, 50, 50, player.currentAbility.img);
	windowManager.toggleUI("playerHUD");
	// end PLAYER INFO HUD
	
	// OPPONENT INFO HUD // {
	windowManager.makeUI("opponentHUD", (opponent.side * canvas.width) - (opponent.side * 100), 0, 100, 50);
	windowManager.makeText("opponentHUD", "username", 15 , 15, canvas.width/10, canvas.height/5, opponent.name, "12pt 'Roboto'", "white");
	windowManager.makeImage("opponentHUD", "currAbilityImg", 50, 0, 50, 50, opponent.currentAbility.img);
	windowManager.toggleUI("opponentHUD");
	// end OPPONENT INFO HUD }
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
		
		// don't need to re-emit static bodies since they don't update
		if (!engine.world.bodies[i].isStatic) {
		
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
	}
	
	
	// update global iteration value which is used to control resting bodies
	globalIteration = (globalIteration + 1) % 10;
}
	
// FUNCTION: update local game instance
function update() {
	// emit player position
	socket.emit("update", {pos: player.pos});
	game.windowManager.updateAndDraw([]);
	
	// request next frame
	requestAnimationFrame(update);
}

window.onload = setupSocket;

})();