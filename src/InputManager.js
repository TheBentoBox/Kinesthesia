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
	}
	

	// Notifies other users of player ability change
	onAbilityChange(socket) {
		socket.on("abilityChange", function(data) {
			if (this.io.sockets.in(this.Manager.room).emit("abilityChange", data));
		});
	}
}

// export entire input manager class as the module
module.exports = InputManager;