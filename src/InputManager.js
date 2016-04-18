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
			
			var newBody = this.Manager.Bodies.rectangle(data.pos.x, data.pos.y, 15, 15);
			var vel = {
					x: socket.lastClick.x - data.pos.x,
					y: socket.lastClick.y - data.pos.y
				};
			this.Manager.Body.setVelocity(newBody, vel);
			
			this.Manager.add(newBody);
			
		}.bind(this));
	}
}

// export entire input manager class as the module
module.exports = InputManager;