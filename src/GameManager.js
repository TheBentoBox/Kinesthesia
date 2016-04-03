/*jshint esversion: 6 */
/*jshint node: true */
"use strict";

var Matter = require("matter-js");

// CLASS: handles an instance of Kinesthesia
class GameManager {
	constructor(io, roomName, player1, player2) {
		this.io = io;
		this.room = roomName;
		this.p1 = player1;
		this.p1.score = 0;
		this.p2 = player2;
		this.p2.score = 0;
		
		// pass new players to handlers
		this.onUpdate(this.p1);
		this.onUpdate(this.p2);
		this.onClick(this.p1);
		this.onClick(this.p2);
		this.onRelease(this.p1);
		this.onRelease(this.p2);
		
		// set screen size
		this.screen = {
			x: 640,
			y: 480
		};
		
		// set up Matter for physics
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
			var newGem = {};
			newGem = {
				x: (Math.random() * (this.screen.x - (2 * this.goalWidth) - (2 * this.gemRad)) + this.goalWidth + this.gemRad),
				y: (Math.random() * (this.screen.y - (2 * this.gemRad)) + this.gemRad)
			};
			this.gems.push(newGem);
		}
		
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
		this.p1.emit(
			"update",
			{
				object: "gems",
				gems: this.gems
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
		this.p2.emit(
			"update",
			{
				object: "gems",
				gems: this.gems
			}
		);
		
		// start player update loops
		this.io.sockets.in(this.room).emit("play");
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
	
	// Callback for user click
	onClick(socket) {
		socket.on("click", function(data) {
			// check click against all gems, starting from the closest to the camera
			for (var i = this.gems.length - 1; i >= 0; i--) {
				if(this.distance(data.pos, this.gems[i]) < (this.gemRad + this.playerRad)) {					
					// remove clicked gem from world array
					this.gems.splice(i, 1);
					
					// update players of interaction
					this.io.sockets.in(this.room).emit(
						"update",
						{
							object: "gems",
							gems: this.gems
						}
					);
					
					socket.emit(
						"update",
						{
							object: "player",
							grabbed: 1
						}
					);
					
					socket.broadcast.to(socket.room).emit(
						"update",
						{
							object: "opponent",
							grabbed: 1
						}
					);
					
					return;
				}
			}
		}.bind(this));
	}
	
	// Callback for user click release
	onRelease(socket) {
		socket.on("release", function(data) {		
			// force grabbed to 0
			socket.emit(
				"update",
				{
					object: "player",
					grabbed: 0
				}
			);
						
			socket.broadcast.to(socket.room).emit(
				"update",
				{
					object: "opponent",
					grabbed: 0
				}
			);
			
			// make sure player has a gem grabbed
			if(data.grabbed == 1) {
				// add new gem to world where player dropped it
				var newGem = {
					x: data.pos.x,
					y: data.pos.y
				};
				
				this.gems.push(newGem);
				
				// update players of interaction
				this.io.sockets.in(this.room).emit(
					"update",
					{
						object: "gems",
						gems: this.gems
					}
				);
				
				// check for scored point
				this.checkScore();
			}
		}.bind(this));
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