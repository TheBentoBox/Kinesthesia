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
			
			socket.lastClick = data.pos;
			
		}.bind(this));
	}
	
	// Callback for user click release
	onRelease(socket) {
		socket.on("release", function(data) {
			
			// make sure lastClick has been declared, otherwise declare and bail out
			if (socket.lastClick == undefined) {
				socket.lastClick = data.pos;
				return;
			}
			
			var newBody = this.Manager.Bodies.circle(socket.lastClick.x, socket.lastClick.y, 15);
			var vel = {
					x: Math.min(30, Math.abs(socket.lastClick.x - data.pos.x)) * Math.sign(socket.lastClick.x - data.pos.x),
					y: Math.min(30, Math.abs(socket.lastClick.y - data.pos.y)) * Math.sign(socket.lastClick.y - data.pos.y)
				};
			this.Manager.Body.setVelocity(newBody, vel);
			
			this.Manager.add(newBody);
			
		}.bind(this));
	}
}

// export entire input manager class as the module
module.exports = InputManager;