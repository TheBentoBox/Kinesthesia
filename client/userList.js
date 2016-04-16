function getUsers() {
	// grab references to page elements
	var userList = document.querySelector('#onlineUsersList');
	
	// connect to socket.io
	// the io variable is from the socket.io script and is global
	socket = (socket || io.connect());
	socket.emit("userdata", userdata);
	
	// request the users from the server
	socket.emit("requestUsers", {});
	
	// listen for receiving of the users
	socket.on("userlist", function(data) {
		var users = data.users;
		// store read usernames so we only display each once
		// counteracts people with multiple tabs open
		var readUsers = {};
		
		// dynamically build list of users
		if (users.length > 0) {
			// clear list
			userList.innerHTML = "";
			
			for (var i = 0; i < users.length; ++i) {
				if (users[i])
					
				// only add listing for user if it's their first time being read
				if (!readUsers[users[i]._id]) {
					readUsers[users[i]._id] = true;
					userList.innerHTML += "<li><strong>Name</strong>: " + users[i].username + "<br />" +
												       "<strong>Games Played</strong>: " + users[i].gamesPlayed + "</span><br />" +
												       "<strong>Games Won</strong>: " + users[i].gamesWon + "<br />" +
												       "<strong>Games Lost</strong>: " + users[i].gamesLost + "<br /></li>"
				}
			}
		}
		else {
			userList.firstChild.innerHTML = "No users online."
		}
	});
}

window.addEventListener("load", getUsers);