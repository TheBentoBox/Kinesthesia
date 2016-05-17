/*jshint esversion: 6 */
/*jshint node: true */
"use strict";

var Matter = require("matter-js");
var InputManager = require("./InputManager.js");
var objects;
var MyRenderer = {
    create: function() {
        return { controller: MyRenderer };
    },

    world: function(engine) {
        // your code here to render engine.world
    }
};

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
		this.p1.room = this.room;
		this.p2.room = this.room;
		this.gameComplete = false;
		
		// Pass new players to event handlers
		this.onUpdate(this.p1);
		this.onUpdate(this.p2);
		
		// Setup for players spawning in objects
		this.onObjectSpawn(this.p1);
		this.onObjectSpawn(this.p2);
		
		// Setup for players deleting objects
		this.onObjectRemove(this.p1);
		this.onObjectRemove(this.p2);
		
		
		// Setup for host callbacs to server
		this.onHostEmit(this.p1);
		this.onGameComplete(this.p1);
		this.onScore(this.p1);
		
		//this.onDisconnect(this.p1);
		//this.onDisconnect(this.p2);
		
		// Pass player sockets to InputManager to set up input events
		this.Input = new InputManager(io, this, this.p1, this.p2);
		
		// Set screen size
		this.screen = {
			x: 1200,
			y: 640
		};
		
		// tell player 1 they're the host
		this.p1.emit("notifyHost");
		
		// update player 1
		this.p1.emit("updateSelf", { side: 0 });
		this.p1.emit(
			"updateOther",
			{
				name: this.p2.name,
				side: 1
			}
		);
		
		// update player 2
		this.p2.emit("updateSelf", { side: 1 });
		this.p2.emit(
			"updateOther",
			{
				name: this.p1.name,
				side: 0
			}
		);
		
		// start player update loops
		this.io.sockets.in(this.room).emit("play");
	}
	
	// Callback for user update
	onUpdate(socket) {
		socket.on("update", function(data) {
			socket.pos = data.pos;
			socket.broadcast.to(this.room).emit("updateOther", data);
		});
	}
	
	// Callback for when a user tries to create an object
	onObjectSpawn(socket) {
		socket.on("requestAddBody", function (data) {
			this.io.sockets.in(this.room).emit("sendOrUpdateBody", data);
		}.bind(this));
	}
	
	// Callback for when a user tries to delete an object
	onObjectRemove(socket) {
		socket.on("requestRemoveBody", function(data) {
			this.io.sockets.in(this.room).emit("removeBody", data);
		}.bind(this));
	}
	
	// Callback for the host sending their objects to the other user
	onHostEmit(socket) {
		socket.on("hostEmitBody", function(data) {
			this.p2.emit("sendOrUpdateBody", data);
		}.bind(this));
	}
	
	// Callback for scoring
	onScore(socket) {
		socket.on("score", function(data) {
			this.io.sockets.in(this.room).emit("score", data);
		}.bind(this));
	}
	
	/* onGameComplete
		desc: called when the game is completed, finds user statistics objects on the sever and
				updates them with results from the game
	*/
	onGameComplete(socket) {
		socket.on ("gameComplete", function(data) {
			// make sure this manager can't send more than 1 score
			if (this.gameComplete) return;
			
			// Check who the winner was
			var winner, loser;
			
			// player 1 is the winner
			if (data.hostScore > data.clientScore) {
				winner = this.p1;
				loser = this.p2;
			}
			// player 2 is the winner
			else if (data.clientScore > data.hostScore) {
				winner = this.p2;
				loser = this.p1;
			}
			// must've been a tie!
			else {
				this.p1.emit("gameComplete", { status: "tied" });
				this.p2.emit("gameComplete", { status: "tied" });
				this.gameComplete = true;
				return;
			}
			
			// notify winner and loser
			winner.emit("gameComplete", { status: "won" });
			loser.emit("gameComplete", { status: "lost" });
			this.gameComplete = true;
		}.bind(this));
	}
}

// export game manager as a module
module.exports = GameManager;