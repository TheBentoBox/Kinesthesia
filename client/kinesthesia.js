"use strict";
// if game exists use the existing copy
// else create a new object literal
var game = game || {};

// IIFE for entire game
game.main = (function() {

// web socket to use
var socket;

// game canvas and context
var canvas, canvasUI;
var ctx, ctxUI;
var canvasPos;
var serverInfo
var windowManager = game.windowManager; // reference to the engine's window manager

// game/server feedback box
var msgBox;

//{ GAME VARS
// abilities the player can switch between
var ABILITIES = {
	CANNONBALL: {
		name: "Cannonball",
		src: "assets/images/iconCannonball.png",
		objRadius: 18,
		launchScaling: 0.125
	},
	GRENADE: {
		name: "Grenade",
		src: "assets/images/iconGrenade.png",
		objRadius: 18,
		launchScaling: 0.125
	},
	GRAVITY_WELL: {
		name: "Gravity Well",
		src: "assets/images/iconGravityWell.png",
		objRadius: 15,
		launchScaling: 0.015
	}
};

// general image src list
var IMAGES = {
	GREEN_GEM: "assets/images/gemGreen.png",
	ORANGE_GEM: "assets/images/gemOrange.png",
	PURPLE_GEM: "assets/images/gemPurple.png"
};

var gemRad = 11; // size of gem bodies (radius)
var gameInitialized = false; // whether main object loop has started, only relevant for host
var IS_HOST = false; // whether this user is the host
var allGemFrame = true; // whether all 3 types of gems will be emitted this frame, or just a neutral one

// represents the colors of each side (sides 0 and 1)
// can reference own color with COLORS[player.side]
var COLORS = {
	0: "#D6861A",
	1: "#600960",
	ORANGE: "#D6861A",
	PURPLE: "#600960"
};

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
	score: 0,
	lastClick: undefined
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
	score: 0,
	lastClick: undefined
};

//} GAME VARS

// FUNCTION: connect socket and setup callbacks
function setupSocket() {

	// Connect to socket.io
	// The io variable is a global var from the socket.io script above
	socket = (socket || io.connect());
	socket.emit("userdata", userdata);
	serverInfo = document.querySelector('#serverInfo');
	
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
		
		// if game init was called before we knew we were the host, do host stuff now
		if (gameInitialized) {
			setupWorld();
			setInterval(emitBodies, 1000/10);
			setInterval(dripGems, 5000);
			// spawn a little starting wave of gems
			for (var i = 0; i < 5; ++i)
				setTimeout(dripGems, 200*i);
		}
	});
	
	// Callback for successful join
	socket.on("joined", function(data) {
		// join feedback
		msgBox.innerHTML = data.msg;
		
		// hide connection form
		document.querySelector("#connectForm").style.visibility = "hidden";
	}); 
	
	// When the server sends us info - updates the ticker at the top of the game
	socket.on("serverInfo", function(data) {
		// temporarily (2 seconds) displays server notifications
		if (serverInfo) {
			serverInfo.style.opacity = 1;
			serverInfo.innerHTML = data.msg;
			setTimeout(function() { serverInfo.style.opacity = 0; }, 2000);
		}
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
						objToMakeOrUpdate = Bodies.circle(data.position.x, data.position.y, data.circleRadius, { id: data.id } );
						break;
				default:
						objToMakeOrUpdate = Bodies.rectangle(data.position.x, data.position.y, data.bounds.max.x - data.bounds.min.x, data.bounds.max.y - data.bounds.min.y, { id: data.id } );
						break;
			}
			
			Matter.Body.set(objToMakeOrUpdate, data);
			
			// force some variables to be set
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
	
	// Callback for update from other user sent by manager
	socket.on("updateOther", function(data) {
		// apply all keys in the data object to they opponent
		for (var key in data) {
			opponent[key] = data[key];
		}
		
		// explicitly check lastClick so it applies correctly
		if (data.lastClick == undefined) {
			opponent.lastClick = undefined;
		}
	});
	
	// Callback for update on own info sent by manager
	socket.on("updateSelf", function(data) {
		// apply all keys in the data object to they opponent
		for (var key in data) {
			player[key] = data[key];
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
	
	// The host starts up the world and begins an object emission loop
	if (IS_HOST && !gameInitialized) {
		setupWorld();
		setInterval(emitBodies, 1000/10);
		setInterval(dripGems, 5000);
		// spawn a little starting wave of gems
		for (var i = 0; i < 5; ++i)
			setTimeout(dripGems, 200*i);
		
		gameInitialized = true;
	}
	
	// Begin update tick
	setTimeout(update, 100);
}

// FUNCTION: Loads in some images
function loadAssets() {
	for (var key in ABILITIES) {
		ABILITIES[key].img = new Image();
		ABILITIES[key].img.src = ABILITIES[key].src;
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
				background: "#222"
			}
		}
	});
	
	// get reference to game canvas and context
	canvas = document.querySelector('canvas');
	canvasUI = document.querySelector('#UI');
	ctx = canvas.getContext("2d");
	ctxUI = canvasUI.getContext("2d");
	canvasPos = canvas.getBoundingClientRect();
	
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
		
		// update player click position
		var rect = canvasUI.getBoundingClientRect();
		player.pos = {
			x: Math.floor(e.clientX - rect.left),
			y: Math.floor(e.clientY - rect.top)
		};
		
		player.lastClick = { x: player.pos.x, y: player.pos.y };
	});
	
	// canvas mouse move for dragging before launching object
	document.addEventListener('mousemove', function(e) {
		
		// update player click position
		var rect = canvasUI.getBoundingClientRect();
		player.pos = {
			x: Math.floor(e.clientX - rect.left),
			y: Math.floor(e.clientY - rect.top)
		};
	});
	
	// setup canvas mouse up behavior
	document.addEventListener('mouseup', function(e) {
		// only accept left clicks here
		if (e.which != 1) return;
		
		// update player click position
		var rect = canvasUI.getBoundingClientRect();
		player.pos = {
			x: Math.floor(e.clientX - rect.left),
			y: Math.floor(e.clientY - rect.top)
		};
						
		// make sure player.lastClick has been declared (the mousedown was captured), otherwise bail out
		if (player.lastClick == undefined) { return; }
		
		// prep the new body
		var newBody = Bodies.circle(player.lastClick.x, player.lastClick.y, player.currentAbility.objRadius);
		var vel = {
				x: clamp((player.lastClick.x - player.pos.x) * player.currentAbility.launchScaling, -15, 15),
				y: clamp((player.lastClick.y - player.pos.y) * player.currentAbility.launchScaling, -15, 15)
			};
		
		// apply velocity and render options to the new body	
		Body.setVelocity(newBody, vel);
		newBody.objectType = player.currentAbility;
		newBody.render.sprite.texture = player.currentAbility.src;
		
		// push the body and reset our last click to stop drawing the line
		add(newBody);
		player.lastClick = undefined;
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
	
	// static world objects
	var ground = Bodies.rectangle(canvas.width/2, canvas.height + 50, canvas.width*1.5, 140, { isStatic: true, render: { fillStyle: "#000" }});
	var p1Wall = Bodies.rectangle(150, canvas.height - 170, 20, 300, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.ORANGE }});
	var p2Wall = Bodies.rectangle(canvas.width - 150, canvas.height - 170, 20, 300, { isStatic: true, render: { fillStyle: "#000000", strokeStyle: COLORS.PURPLE }});
	var leftWall = Bodies.rectangle(-10, -canvas.height, 20, canvas.height*4, { isStatic: true, render: { strokeStyle: '#000' } } );
	var rightWall = Bodies.rectangle(canvas.width + 10, -canvas.height, 20, canvas.height*4, { isStatic: true, render: { strokeStyle: '#000' } } );
	
	// platforms
	var leftTiltPlatform = Bodies.rectangle(canvas.width/3.5, canvas.height/4, 225, 1, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.ORANGE }});
	var rightTiltPlatform = Bodies.rectangle(canvas.width - canvas.width/3.5, canvas.height/4, 225, 1, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.PURPLE }});
	Body.setAngle(leftTiltPlatform, (20/360) * Math.PI);
	Body.setAngle(rightTiltPlatform, (-20/360) * Math.PI);
	
	add ([ground, p1Wall, p2Wall, leftWall, rightWall, leftTiltPlatform, rightTiltPlatform]);
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
	// allows us to pass in an array of objects to emit
	var emitObj = obj;
	if (!Array.isArray(obj)) {
		emitObj = [obj];
	}
	
	// emit each thing in the array individually
	for (var i = 0; i < emitObj.length; ++i) {
		socket.emit(
			"requestAddBody",
			processBody(emitObj[i])
		);
	}
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
	
// Drops scoring gems into the world periodically
function dripGems() {
	// the green neutral gem always spawns
	var greenGem = Bodies.circle(canvas.width/2 + (Math.random()*20 - 10), -10, gemRad);
	greenGem.render.sprite.texture = IMAGES.GREEN_GEM;
	add(greenGem);
		
	// the player-specific gems only spawn on all gem frames
	if (allGemFrame) {
		var orangeGem = Bodies.circle(canvas.width/3 + (Math.random()*20 - 10), -10, gemRad);
		orangeGem.render.sprite.texture = IMAGES.ORANGE_GEM;
		
		var purpleGem = Bodies.circle(2*canvas.width/3 + (Math.random()*20 - 10), -10, gemRad);
		purpleGem.render.sprite.texture = IMAGES.PURPLE_GEM;
		
		add([orangeGem, purpleGem]);
	}
	
	// next spawn frame does opposite
	allGemFrame = !allGemFrame;
}
	
// FUNCTION: update local game instance
function update() {
	// emit player position
	socket.emit("update", { pos: player.pos, lastClick: player.lastClick });
	
	// draw UI
	ctxUI.clearRect(0, 0, canvasUI.width, canvasUI.height);
	draw();
	game.windowManager.updateAndDraw([]);
	
	// request next frame
	requestAnimationFrame(update);
}

// DRAW FUNCTION: draws some bits to the UI that aren't easy for the window manager
function draw() {
	// draw opponent's draw line if they're currently dragging
	ctxUI.strokeStyle = ctxUI.fillStyle = COLORS[opponent.side];
	if (opponent.lastClick) {
		ctxUI.beginPath();	
		ctxUI.moveTo(opponent.lastClick.x, opponent.lastClick.y);
		ctxUI.lineTo(opponent.pos.x, opponent.pos.y);
		ctxUI.stroke();
	}
	ctxUI.beginPath();	
	ctxUI.arc(opponent.pos.x, opponent.pos.y, 5, 0, Math.PI * 2);
	ctxUI.fill();
	ctxUI.closePath();
	
	// draw our own draw line if we're currently dragging
	ctxUI.strokeStyle = ctxUI.fillStyle = COLORS[player.side];
	if (player.lastClick) {
		ctxUI.beginPath();
		ctxUI.moveTo(player.lastClick.x, player.lastClick.y);
		ctxUI.lineTo(player.pos.x, player.pos.y);
		ctxUI.stroke();
	}
	ctxUI.beginPath();	
	ctxUI.arc(player.pos.x, player.pos.y, 5, 0, Math.PI * 2);
	ctxUI.fill();
	ctxUI.closePath();
}

window.addEventListener("load", setupSocket);

})();