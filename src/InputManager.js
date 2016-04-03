/*jshint esversion: 6 */
/*jshint node: true */
"use strict";

class InputManager {
	constructor(io, manager, player1, player2) {
		// Class variables
		this.io = io;
		this.Manager = manager;
		this.p1 = player1;
		this.p2 = player2;
		
		// Pass the player sockets to input event handlers
		this.onClick(this.p1);
		this.onClick(this.p2);
		this.onRelease(this.p1);
		this.onRelease(this.p2);
	}
	
	// Callback for user click
	onClick(socket) {
		socket.on("click", function(data) {
			// check click against all gems, starting from the closest to the camera
			for (var i = this.Manager.engine.world.bodies.length - 1; i >= 0; i--) {
				if(this.Manager.distance(data.pos, this.Manager.engine.world.bodies.position[i]) < (this.Manager.gemRad + this.Manager.playerRad)) {					
					// remove clicked gem from world array
					this.Manager.engine.world.bodies.splice(i, 1);
					
					// update players of interaction
					this.Manager.emitGems();
					
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
			if (data.grabbed === 1) {
				// add new gem to world where player dropped it
				var newGem = {
					x: data.pos.x,
					y: data.pos.y
				};
				
				this.Manager.gems.push(newGem);
				
				// update players of interaction
				this.io.sockets.in(this.Manager.room).emit(
					"update",
					{
						object: "gems",
						gems: this.Manager.gems
					}
				);
				
				// check for scored point
				this.Manager.checkScore();
			}
		}.bind(this));
	}
}

// export entire input manager class as the module
module.exports = InputManager;