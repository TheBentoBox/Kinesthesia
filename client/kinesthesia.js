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
		lifetime: 1200,
		launchScaling: 0.25,
		maxVel: 30,
		restitution: 0.8
	},
	GRENADE: {
		name: "Grenade",
		src: "assets/images/iconGrenade.png",
		objRadius: 18,
		lifetime: 120,
		launchScaling: 0.125,
		maxVel: 15,
		restitution: 0.2,
		maxForce: 1.5
	},
	GRAVITY_WELL: {
		name: "Gravity Well",
		src: "assets/images/iconGravityWell.png",
		objRadius: 15,
		lifetime: 300,
		launchScaling: 0.015,
		maxVel: 10,
		restitution: 1,
		maxForce: 0.1
	}
};

// general image src list
var IMAGES = {
	GREEN_GEM: "assets/images/gemGreen.png",
	ORANGE_GEM: "assets/images/gemOrange.png",
	PURPLE_GEM: "assets/images/gemPurple.png"
};

var IS_HOST = false; // whether this user is the host

// Game control variables
var gameComplete = false; // whether or not the game has finished yet
var gameInitialized = false; // whether main object loop has started, only relevant for host
var gameTime = 3600; // time left in this game

// Gem related variables
var dripGemsTimeoutID = -1; // ID of dripGems timeout, used by host, cancelled when game ends
var emitBodiesTimeoutID = -1; // ID of emitBodies timeout, used by host, cancelled when game ends
var gemRad = 11; // size of gem bodies (radius)
var allGemFrame = true; // whether all 3 types of gems will be emitted this frame, or just a neutral one
var maxGems = 20; // maximum number of gems allowed onscreen
var currentGems = 0; // current number of gems onscren

// dimensions of the goal area and other world statics
var goal = {
	width: 150,
	height: 200
}
var groundHeight = 20;
var goalWallWidth = 50;

// represents the colors of each side (sides 0 and 1)
// can reference own color with COLORS[player.side]
var COLORS = {
	0: "#D6861A",
	1: "#9E119E",
	2: "#09EC09",
	ORANGE: "#D6861A",
	PURPLE: "#9E119E",
	GREEN: "#09EC09"
};

// used to control frames in which resting objects are emitted
// resting objects are occasionally forcibly emitted at times based on the frame they fall asleep
var globalIteration = 0;

// Shorthand for Matter components
var Engine, World, Bodies, Body, Vector;
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
			emitBodiesTimeoutID = setInterval(emitBodies, 1000/10);
			dripGemsTimeoutID = setInterval(dripGems, 5000);
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
	
	// Callback for deleting an object
	socket.on("removeBody", function(data) {		
		// find object to remove
		var objToRemove = Matter.Composite.get(engine.world, data.id, "body");
		
		// remove it from world composite
		Matter.Composite.remove(engine.world, objToRemove);
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
			windowManager.modifyText("gameHUD", "message", "text", {string: userdata.username + " scores a point!", css: "12pt 'Roboto'", color: "white"});
			player.score += data.points;
			windowManager.modifyText("playerHUD", "score", "text", {string: player.score.toString(), css: "12pt 'Roboto'", color: "white"});
		}
		// opponent point
		else {
			windowManager.modifyText("gameHUD", "message", "text", {string: opponent.name + " scores a point!", css: "12pt 'Roboto'", color: "white"});
			opponent.score += data.points;
			windowManager.modifyText("opponentHUD", "score", "text", {string: opponent.score.toString(), css: "12pt 'Roboto'", color: "white"});
		}	
	});
	
	// Listen for game completion events, which let us know the game
	// is over and whether we won or lost. Updates statistics.
	socket.on("gameComplete", function(data) {
		
		// send the game completion info to the server for stats updates
		data._csrf = $("#token").val();
		sendAjax("/updateStats", data);
		
		// update the main message box to say how they did
		windowManager.modifyText("gameHUD", "message", "text", { string: "You " + data.status + "!", css: "12pt 'Roboto'", color: "white"});
		
		// stop running the game if we're the host
		if (IS_HOST) {
			clearTimeout(emitBodiesTimeoutID);
			clearTimeout(dripGemsTimeoutID);
		}
		
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
		emitBodiesTimeoutID = setInterval(emitBodies, 1000/10);
		dripGemsTimeoutID = setInterval(dripGems, 5000);
		
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
	Vector = Matter.Vector;
		
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
			x: clamp(Math.floor(e.clientX - rect.left), player.side*canvas.width/2, (player.side*canvas.width/2) + canvas.width/2),
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
		
		// clamp player x on their side if they're not dragging
		if (player.lastClick == undefined) {
			player.pos.x = clamp(player.pos.x, player.side*canvas.width/2, (player.side*canvas.width/2) + canvas.width/2);
		}
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
		
		var velDir = Vector.sub(player.lastClick, player.pos);
		var velMag = Math.min(Vector.magnitude(velDir) * player.currentAbility.launchScaling, player.currentAbility.maxVel);
		velDir = Vector.normalise(velDir);
		var vel = Vector.mult(velDir, velMag);
		
		// make sure it has a unique ID
		var bodyIDFound = false;
		var highestFoundID = -1;
		for (var i = 0; i < engine.world.bodies.length; ++i) {
			var body = engine.world.bodies[i];
			
			// store highest ID
			if (body.id > highestFoundID) {
				highestFoundID = body.id;
			}
			
			// check if it's the same ID as the one we just created
			if (body.id == newBody.id) {
				bodyIDFound = true;
			}
		}
		
		// re-assign a new ID if we found ours was already taken
		if (bodyIDFound) {
			newBody.id = highestFoundID + 1;
		}
		
		// apply velocity and render options to the new body	
		Body.setVelocity(newBody, vel);
		newBody.objectType = player.currentAbility;
		newBody.render.sprite.texture = player.currentAbility.src;
		newBody.restitution = newBody.objectType.restitution;
		
		// set special object properties
		switch (newBody.objectType.name) {
			case "Cannonball":
				break;
			case "Grenade":
				break;
			case "Gravity Well":
				Body.setAngularVelocity(newBody, .1);
				newBody.collisionFilter.category = 0x0002;
				newBody.collisionFilter.mask = newBody.collisionFilter.category;
				break;
			default:
				break;
		}
		
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
	//{ PLAYER INFO HUD //
	windowManager.makeUI("playerHUD", (player.side * canvas.width) - (player.side * 150), 0, 150, 50);
	windowManager.modifyUI("playerHUD", "fill", {color: "rgba(0, 0, 0, 0.5)"});
	windowManager.modifyUI("playerHUD", "border", {color: COLORS[player.side], width: "1px"});
	windowManager.makeText("playerHUD", "username", 45 , 15, canvas.width/10, canvas.height/5, userdata.username, "12pt 'Roboto'", "white");
	windowManager.makeText("playerHUD", "score", 15, 15, 50, 50, player.score.toString(), "12pt 'Roboto'", "white");
	windowManager.makeImage("playerHUD", "currAbilityImg", 85, 0, 50, 50, player.currentAbility.img);
	windowManager.toggleUI("playerHUD");
	//} end PLAYER INFO HUD
	
	//{ OPPONENT INFO HUD //
	windowManager.makeUI("opponentHUD", (opponent.side * canvas.width) - (opponent.side * 150), 0, 150, 50);
	windowManager.modifyUI("opponentHUD", "fill", {color: "rgba(0, 0, 0, 0.5)"});
	windowManager.modifyUI("opponentHUD", "border", {color: COLORS[opponent.side], width: "1px"});
	windowManager.makeText("opponentHUD", "username", 45 , 15, canvas.width/10, canvas.height/5, opponent.name, "12pt 'Roboto'", "white");
	windowManager.makeText("opponentHUD", "score", 15, 15, 50, 50, opponent.score.toString(), "12pt 'Roboto'", "white");
	windowManager.makeImage("opponentHUD", "currAbilityImg", 85, 0, 50, 50, opponent.currentAbility.img);
	windowManager.toggleUI("opponentHUD");
	//} end OPPONENT INFO HUD

	//{ GAME INFO HUD //
		windowManager.makeUI("gameHUD", canvas.width/2 - 150, 0, 300, 75);
		windowManager.modifyUI("gameHUD", "fill", {color: "rgba(0, 0, 0, 0.5)"});
		windowManager.modifyUI("gameHUD", "border", {color: COLORS.GREEN, width: "1px"});
		windowManager.makeText("gameHUD", "message", 35 , 15, 230, 30, "", "12pt 'Roboto'", "white");
		windowManager.makeText("gameHUD", "time", 135, 40, 75, 30, "%v sec", "12pt 'Roboto'", "white");
		windowManager.toggleUI("gameHUD");
	//} end GAME INFO HUD
}

// INITAL GAME SETUP: sets up starting world objects
function setupWorld() {
	
	//=== Static world objects
	// Player 1's goal walls
	var p1WallLower = Bodies.rectangle(goal.width + goalWallWidth/2, canvas.height - groundHeight/2 - goal.height/2, goalWallWidth, goal.height + groundHeight, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.ORANGE }});
	var p1WallUpper = Bodies.rectangle(goal.width + goalWallWidth/2, goal.height/2, goalWallWidth, goal.height, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.ORANGE }});
	// Player 2's goal walls
	var p2WallLower = Bodies.rectangle(canvas.width - goal.width - goalWallWidth/2, canvas.height - groundHeight/2 - goal.height/2, goalWallWidth, goal.height + groundHeight, { isStatic: true, render: { fillStyle: "#000000", strokeStyle: COLORS.PURPLE }});
	var p2WallUpper = Bodies.rectangle(canvas.width - goal.width - goalWallWidth/2, goal.height/2, goalWallWidth, goal.height, { isStatic: true, render: { fillStyle: "#000000", strokeStyle: COLORS.PURPLE }});
	// Main retaining walls & ground
	var leftWall = Bodies.rectangle(-10, -canvas.height, 20, canvas.height*4, { isStatic: true, render: { strokeStyle: '#000' } } );
	var rightWall = Bodies.rectangle(canvas.width + 10, -canvas.height, 20, canvas.height*4, { isStatic: true, render: { strokeStyle: '#000' } } );
	var ground = Bodies.rectangle(canvas.width/2, canvas.height + 50, canvas.width*1.5, 140, { isStatic: true, render: { fillStyle: "#000" }});
	// Ceiling pieces
	var leftCeilingPiece = Bodies.rectangle(canvas.width/7 - 50, -20, canvas.width/3.5, 41, { isStatic: true, render: { strokeStyle: '#000' } });
	var middleCeilingPieceL = Bodies.rectangle(canvas.width/2 - 100, -20, canvas.width/7 - 25, 41, { isStatic: true, render: { strokeStyle: '#000' } });
	var middleCeilingPieceR = Bodies.rectangle(canvas.width/2 + 100, -20, canvas.width/7 - 25, 41, { isStatic: true, render: { strokeStyle: '#000' } });
	var rightCeilingPiece = Bodies.rectangle(canvas.width - canvas.width/7 + 50, -20, canvas.width/3.5, 41, { isStatic: true, render: { strokeStyle: '#000' } });
	// Gem funnels
	var leftFunnelL = Bodies.rectangle(canvas.width/3.5 - 50, canvas.height/4 - 25, 125, 10, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.ORANGE }});
	var leftFunnelR = Bodies.rectangle(canvas.width/3.5 + 50, canvas.height/4 - 25, 125, 10, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.ORANGE }});
	var middleFunnelL = Bodies.rectangle(canvas.width/2 - 50, canvas.height/4 - 25 - canvas.height/10, 125, 10, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.GREEN }});
	var middleFunnelR = Bodies.rectangle(canvas.width/2 + 50, canvas.height/4 - 25 - canvas.height/10, 125, 10, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.GREEN }});
	var rightFunnelL = Bodies.rectangle(canvas.width - canvas.width/3.5 - 50, canvas.height/4 - 25, 125, 10, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.PURPLE }});
	var rightFunnelR = Bodies.rectangle(canvas.width - canvas.width/3.5 + 50, canvas.height/4 - 25, 125, 10, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.PURPLE }});
	Body.setAngle(leftFunnelL, (60/360) * Math.PI*2);
	Body.setAngle(leftFunnelR, (-60/360) * Math.PI*2);
	Body.setAngle(middleFunnelL, (60/360) * Math.PI*2);
	Body.setAngle(middleFunnelR, (-60/360) * Math.PI*2);
	Body.setAngle(rightFunnelL, (60/360) * Math.PI*2);
	Body.setAngle(rightFunnelR, (-60/360) * Math.PI*2);
	// Gem platforms
	var leftGemPlatform = Bodies.rectangle(canvas.width/3.5, canvas.height*0.75, 175, 10, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.ORANGE }});
	var middleGemPlatform = Bodies.rectangle(canvas.width/2, canvas.height*0.65, 175, 10, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.GREEN }});
	var rightGemPlatform = Bodies.rectangle(canvas.width - canvas.width/3.5, canvas.height*0.75, 175, 10, { isStatic: true, render:{ fillStyle: "#000000", strokeStyle: COLORS.PURPLE}});
	
	add ([p1WallLower, p1WallUpper, p2WallLower, p2WallUpper, leftWall, rightWall, ground, leftCeilingPiece, middleCeilingPieceL, middleCeilingPieceR, rightCeilingPiece, leftFunnelL, leftFunnelR, middleFunnelL, middleFunnelR, rightFunnelL, rightFunnelR, leftGemPlatform, middleGemPlatform, rightGemPlatform]);
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
		restitution: physBody.restitution,
		render: physBody.render,
		isStatic: physBody.isStatic,
		collisionFilter: physBody.collisionFilter,
		circleRadius: physBody.circleRadius,
		time: new Date().getTime(),
		objectType: physBody.objectType
	}
}

// Adds an object to the world, immediately emitting it to the other user
function add(obj) {
	// in general, don't let them send objects once the game ends
	if (!gameComplete) {
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
	
	if (currentGems < maxGems) {
		
		// the green neutral gem always spawns
		var greenGem = Bodies.circle(canvas.width/2 + (Math.random()*20 - 10), -10, gemRad);
		greenGem.render.sprite.texture = IMAGES.GREEN_GEM;
		greenGem.restitution = 0.5;
		greenGem.objectType = {
			name: "Gem",
			color: COLORS.GREEN
		};
		add(greenGem);
			
		// the player-specific gems only spawn on all gem frames
		if (currentGems < maxGems && allGemFrame) {
			var orangeGem = Bodies.circle(canvas.width/3.5 + (Math.random()*100 - 50), -10, gemRad, { restitution: 0.3 });
			orangeGem.render.sprite.texture = IMAGES.ORANGE_GEM;
			orangeGem.restitution = 0.5;
			orangeGem.objectType = {
				name: "Gem",
				color: COLORS.ORANGE
			};
			add(orangeGem);
			
			if (currentGems < maxGems) {
				var purpleGem = Bodies.circle(canvas.width - canvas.width/3.5 + (Math.random()*100 - 50), -10, gemRad, { restitution: 0.3 });
				purpleGem.render.sprite.texture = IMAGES.PURPLE_GEM;
				purpleGem.restitution = 0.5;
				purpleGem.objectType = {
					name: "Gem",
					color: COLORS.PURPLE
				};
				
				add(purpleGem);
			}
		}
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
	game.windowManager.updateAndDraw([{name: "time", value: [(Math.ceil(gameTime/60)).toString()]}]);
	
	// only perform object updates and timing while the game is running
	if (!gameComplete) {
		// update special game objects
		var allObj = engine.world.bodies;
		currentGems = 0;
		
		for (var i = 0; i < allObj.length; i++) {
			var obj = allObj[i];
			
			if (obj.objectType) {
				// check for objects that are supposed to be dead, and forcibly remove them
				if (obj.objectType.lifetime < 0) {
					Matter.Composite.remove(engine.world, obj);
					continue;
				}
				
				switch (obj.objectType.name) {
					case "Cannonball":
						// decrement lifetime
						obj.objectType.lifetime--;
						
						// remove if lifetime over
						if (obj.objectType.lifetime <= 0 && IS_HOST) {
							socket.emit(
								"requestRemoveBody",
								processBody(obj)
							);
						}
						break;
					case "Grenade":
						// decrement lifetime
						obj.objectType.lifetime--;
						
						// explode if lifetime over
						if (obj.objectType.lifetime <= 0 && IS_HOST) {
							// make grenade blow away objects
							for (var j = 0; j < allObj.length; j++) {
								if (i != j) {
									// grab other object in world
									var other = allObj[j];
									
									// calculate explosive force
									var exploDir = Vector.sub(other.position, obj.position);
									var exploIntensity = obj.objectType.maxForce / Math.max(Vector.magnitude(exploDir), 20);
									exploDir = Vector.normalise(exploDir);
									var exploForce = Vector.mult(exploDir, exploIntensity);
									
									// apply force
									Body.applyForce(other, other.position, exploForce);
								}
							}
							
							// remove grenade
							socket.emit(
								"requestRemoveBody",
								processBody(obj)
							);
						}
						break;
					case "Gravity Well":
						// decrement lifetime
						obj.objectType.lifetime--;
						
						// make well float and spin constantly
						Body.applyForce(obj, obj.position, {x: 0, y: -engine.world.gravity.y * engine.world.gravity.scale / 1.45});
						Body.setAngularVelocity(obj, .1);
						
						// make well suck in objects
						for (var j = 0; j < allObj.length; j++) {
							if (i != j) {
								// grab other object in world
								var other = allObj[j];
								
								// calculate point gravity
								var gravDir = Vector.sub(obj.position, other.position);
								var gravIntensity = obj.objectType.maxForce / Math.max(Vector.magnitude(gravDir), 5);
								gravDir = Vector.normalise(gravDir);
								var gravForce = Vector.mult(gravDir, gravIntensity);
								
								// apply gravity
								Body.applyForce(other, other.position, gravForce);
							}
						}
						
						// remove if lifetime over
						if (obj.objectType.lifetime <= 0 && IS_HOST) {
							socket.emit(
								"requestRemoveBody",
								processBody(obj)
							);
						}
						break;
					case "Gem":
						++currentGems;
						
						// check if gem is within goal region
						if (IS_HOST && (obj.position.x <= goal.width || obj.position.x >= canvas.width - goal.width)) {
							// check if in host goal
							if (obj.position.x <= goal.width) {
								// score based on color of gem
								switch (obj.objectType.color) {
									case COLORS.ORANGE:
										socket.emit(
											"score",
											{
												side: player.side,
												points: 1
											}
										);
										break;
									case COLORS.GREEN:
										socket.emit(
											"score",
											{
												side: player.side,
												points: 2
											}
										);
										break;
									case COLORS.PURPLE:
										socket.emit(
											"score",
											{
												side: player.side,
												points: 3
											}
										);
										break;
									default:
										break;
								}
							}
							
							// check if in client goal
							else if (obj.position.x >= canvas.width - goal.width) {
								// score based on color of gem
								switch (obj.objectType.color) {
									case COLORS.ORANGE:
										socket.emit(
											"score",
											{
												side: opponent.side,
												points: 3
											}
										);
										break;
									case COLORS.GREEN:
										socket.emit(
											"score",
											{
												side: opponent.side,
												points: 2
											}
										);
										break;
									case COLORS.PURPLE:
										socket.emit(
											"score",
											{
												side: opponent.side,
												points: 1
											}
										);
										break;
									default:
										break;
								}
							}
							
							socket.emit(
								"requestRemoveBody",
								processBody(obj)
							);
						}
						break;
					default:
						break;
				}
			}
		}
		
		// increment game time
		if (gameTime > 0) {
			--gameTime;
			
			// game has ended!
			if (gameTime === 0) {
				gameComplete = true;
				
				// if we're the host, notify the server of the end
				if (IS_HOST) {
					
					// forcibly count all gems that are in the goal
					for (var i = 0; i < allObj.length; i++) {
						var obj = allObj[i];
						
						if (obj.objectType) 
						if (obj.objectType.name === "Gem") {
							
							// check if in host goal
							if (obj.position.x <= goal.width) {
								// score based on color of gem
								switch (obj.objectType.color) {
									case COLORS.ORANGE:
										player.score += 1;
										break;
									case COLORS.GREEN:
										player.score += 2;
										break;
									case COLORS.PURPLE:
										player.score += 3;
										break;
								}
								
								socket.emit(
									"requestRemoveBody",
									processBody(obj)
								);
							}
							
							// check if in client goal
							else if (obj.position.x >= canvas.width - goal.width) {
								// score based on color of gem
								switch (obj.objectType.color) {
									case COLORS.ORANGE:
										opponent.score += 3;
										break;
									case COLORS.GREEN:
										player.score += 2;
										break;
									case COLORS.PURPLE:
										player.score += 1;
										break;
								}
								
								socket.emit(
									"requestRemoveBody",
									processBody(obj)
								);
							}
						}
					}
					
					// send scores so server can distribute status update events
					socket.emit("gameComplete", { hostScore: player.score, clientScore: opponent.score });
				}
			}
		}
	}
	
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