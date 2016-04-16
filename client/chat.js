function connectChat() {
	// grab references to page chat elements
	var chatWindow = document.querySelector('#chatWindow');
	var chatInput = document.querySelector('#chatInput');
	var chatWinHeight = chatWindow.scrollHeight;
	
	// connect to socket.io
	// the io variable is from the socket.io script and is global
	socket = (socket || io.connect());
	socket.emit("userdata", userdata);
	
	// update chat window on connect
	socket.on('connect', function(data) {
		
		chatWindow.innerHTML = "<p><strong>Server</strong>: Connected to chat!</p>"
	});
	
	// listener for msg event
	socket.on('msg', function(data) {
		
		chatWindow.innerHTML += "<p class='otherUserMsg''><strong>" + data.name + "</strong>: " + data.msg + "</p>";
	});
	
	// allow users to send messages (with the enter key)
	chatInput.addEventListener('keyup', function(e) {
		if (e.keyCode === 13) {
			// catch message over 250 chars
			if (chatInput.value.length > 250 || chatInput.value === "") {
				chatInput.value = "";
				return;
			}
			
			chatWindow.innerHTML += "<p class='userMsg'>" + chatInput.value + "</p>";
			socket.emit('chatMsg', { name: userdata.username, msg: chatInput.value } );
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