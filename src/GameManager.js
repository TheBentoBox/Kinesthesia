/*jshint esversion: 6 */
/*jshint node: true */
"use strict";

var Matter = require("matter-js");
var InputManager = require("./InputManager.js");

// CLASS: handles an instance of Kinesthesia
class GameManager {
	constructor(io, roomName, player1, player2) {
		// Initalize class variables
		this.io = io;
		this.room = roomName;
		this.p1 = player1;
		this.p1.score = 0;
		this.p2 = player2;
		this.p2.score = 0;
		
		// Pass new players to update event handlers
		this.onUpdate(this.p1);
		this.onUpdate(this.p2);
		
		// Pass player sockets to InputManager to set up input events
		this.Input = new InputManager(io, this, this.p1, this.p2);
		
		// Set screen size
		this.screen = {
			x: 640,
			y: 480
		};
		
		// Setup Matter for physics
		this.initializeMatter();
		
		// size constants
		this.playerRad = 4;
		this.gemRad = 15;
		this.goalWidth = 100;
		
		// set players to default starting locations
		this.p1.pos = {
			x: 15,
			y: this.screen.y / 2
		};
		this.p2.pos = {
			x: this.screen.x - 15,
			y: this.screen.y / 2
		};
		
		// randomly create gems
		this.gems = [];
		for (var i = 0; i < 20; i++) {
			var newGem = this.Bodies.rectangle(
				(Math.random() * (this.screen.x - (2 * this.goalWidth) - (2 * this.gemRad)) + this.goalWidth + this.gemRad),
				(Math.random() * (this.screen.y - (2 * this.gemRad)) + this.gemRad),
				this.gemRad,
				this.gemRad
			);
			this.gems.push(newGem);
		}
		this.World.add(this.engine.world, this.gems);
		
		// update player 1
		this.p1.emit("msg", {msg: "Game started. You are playing against " + this.p2.name + "."});
		this.p1.emit(
			"update",
			{
				object: "player",
				pos: this.p1.pos,
				side: 0
			}
		);
		this.p1.emit(
			"update",
			{
				object: "opponent",
				name: this.p2.name,
				pos: this.p2.pos,
				side: 1
			}
		);
		
		// update player 2
		this.p2.emit("msg", {msg: "Game started. You are playing against " + this.p1.name + "."});
		this.p2.emit(
			"update",
			{
				object: "player",
				pos: this.p2.pos,
				side: 1
			}
		);
		this.p2.emit(
			"update",
			{
				object: "opponent",
				name: this.p1.name,
				pos: this.p1.pos,
				side: 0
			}
		);
			
		this.emitGems();
		
		// start player update loops
		this.io.sockets.in(this.room).emit("play");
	}
	
	
	emitGems() {
		for (var i = 0; i < this.engine.world.bodies.length; ++i) {
			this.io.sockets.in(this.room).emit(
				"update",
				{
					object: "gem",
					gem: this.engine.world.bodies[i]
				}
			);
		}
	}
	
	// Sets up Matter engine and world
	initializeMatter() {
		// create module aliases
		this.Engine = Matter.Engine;
		this.World = Matter.World;
		this.Bodies = Matter.Bodies;
			
		// create an engine
		this.engine = this.Engine.create();
		
		// create the ground and add it to the world
		this.ground = this.Bodies.rectangle(0, this.screen.y - 20, this.screen.x, 20, { isStatic: true });
		this.World.add(this.engine.world, [this.ground]);
	}
	
	// Callback for user update
	onUpdate(socket) {
		socket.on("update", function(data) {
			socket.pos = data.pos;
			socket.broadcast.to(socket.room).emit(
				"update", 
				{ 
					object: "opponent", 
					pos: data.pos 
				}
			);
		});
	}
	
	// FUNCTION: distance formula
	distance(a, b) {
		return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
	}
	
	// FUNCTION: check gems to see if a point has been scored
	checkScore() {
		for (var i = 0; i < this.gems.length; i++) {
			// player 1 scores
			if(this.gems[i].x < (this.goalWidth - this.gemRad)) {
				// remove scored gem
				this.gems.splice(i, 1);
				i--;
				
				// notify of score
				this.io.sockets.in(this.room).emit(
					"update",
					{
						object: "gems",
						gems: this.gems
					}
				);
				
				this.io.sockets.in(this.room).emit("score", {side: 0});
				this.p1.score++;
			}
			
			// player 2 scores
			else if(this.gems[i].x > (this.screen.x - this.goalWidth + this.gemRad)) {
				// remove scored gem
				this.gems.splice(i, 1);
				i--;
				
				// notify of score
				this.io.sockets.in(this.room).emit(
					"update",
					{
						object: "gems",
						gems: this.gems
					}
				);
				
				this.io.sockets.in(this.room).emit("score", {side: 1});
				this.p2.score++;
			}
		}
		
		// check for win
		if(this.gems.length === 0) {
			// player 1 wins
			if(this.p1.score > this.p2.score) {
				this.io.sockets.in(this.room).emit("end", {side: 0});
			}
			
			// player 2 wins
			else if(this.p2.score > this.p1.score) {
				this.io.sockets.in(this.room).emit("end", {side: 1});
			} 
			
			// tie
			else {
				this.io.sockets.in(this.room).emit("end", {side: 2});
			} 
		}
	}
}

// export game manager as a module
module.exports = GameManager;