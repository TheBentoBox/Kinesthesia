function connectChat() {
	if (userdata == undefined) return;
	
	// grab references to page chat elements
	var chatWindow = document.querySelector('#chatWindow');
	var chatInput = document.querySelector('#chatInput');
	var chatWinHeight = chatWindow.scrollHeight;
	
	// connect to socket.io
	// the io variable is from the socket.io script and is global
	socket = (socket || io.connect());
	socket.emit("userdata", userdata);
	
	// General 'create message' to add a bubble to the chat window
	function createMessage(user, message, className, color) {
		
		// Elements repesenting the message bubble and the message text
		var p = document.createElement("p");
		var pMsg = document.createElement("span");
		
		// Set up bubble, giving it the username and correct color class/property
		p.innerHTML = "<strong>" + user + "</strong>: ";
		p.className += className;
		if (color != undefined)
			p.style.backgroundColor = color;
		
		// Fill bubble with message
		pMsg.textContent = message;
		
		// Attach message to bubble, and bubble to chat window
		p.appendChild(pMsg);
		chatWindow.appendChild(p);
	}
	
	// update chat window on connect
	socket.on('connect', function(data) {
		
		document.querySelector('.serverMsg').innerHTML =  "Connected to chat!";
	});
	
	// listener for msg event
	socket.on('msg', function(data) {
		
		createMessage(data.name, data.msg, "otherUserMsg", (data.name == globalOpponentName ? globalOpponentColor : undefined));
	});
	
	// listener for msg event
	socket.on('serverMsg', function(data) {
		
		createMessage("SERVER", data.msg, "serverMsg", undefined);
	});
	
	// allow users to send messages (with the enter key)
	chatInput.addEventListener('keyup', function(e) {
		if (e.keyCode === 13) {
			// catch message over 250 chars
			if (chatInput.value.length > 250 || chatInput.value === "") {
				chatInput.value = "";
				return;
			}
			
			// add the message to our own window
			createMessage(userdata.username, chatInput.value, "userMsg", globalUserColor);
			
			// emit the message to the other users
			socket.emit('chatMsg', { name: userdata.username, msg: chatInput.value } );
			
			// slide up the chat window and clear the input box	
			chatWindow.scrollTop = chatWindow.scrollHeight - chatWinHeight;
			chatInput.value = "";
		}
	});
	
	// make buttons above chat click their inner a's
	var buttons = document.querySelectorAll('#navColumn li');
	
	for (var i = 0; i < buttons.length; ++i) {
		buttons[i].addEventListener("click", function(e) {
			// only do so for left clicks
			if (e.which === 1) {
				e.target.firstChild.click();
			}
		});
	}
}

window.addEventListener("load", connectChat);