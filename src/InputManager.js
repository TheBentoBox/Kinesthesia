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
		
		this.onAbilityChange(this.p1);
		this.onAbilityChange(this.p2);
	}

	// Notifies other users of player ability change
	onAbilityChange(socket) {
		socket.on("abilityChange", function(data) {
			// send data to other user
			socket.broadcast.to(socket.room).emit("abilityChange", data);
		}.bind(this));
	}
}

// export entire input manager class as the module
module.exports = InputManager;