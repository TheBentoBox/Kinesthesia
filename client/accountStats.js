function fillStats() {
	// grab element references
	var pctWinSpan = document.querySelector('#pctWin');
	var pctTiedSpan = document.querySelector('#pctTied');
	var pctLossSpan = document.querySelector('#pctLoss');
	var winLossRatioSpan = document.querySelector('#winLossRatio');
	
	// only attempt calculation if they've played yet
	if (userdata.gamesPlayed > 0) {
		var pctWins = ((Math.floor(userdata.gamesWon / userdata.gamesPlayed * 10000))/100) + "%";
		var pctTied = ((Math.floor(userdata.gamesTied / userdata.gamesPlayed * 10000))/100) + "%";
		var pctLost = ((Math.floor(userdata.gamesLost / userdata.gamesPlayed * 10000))/100) + "%";
		
		// catch if they've won all of their games
		if (userdata.gamesLost === 0) {
			var winLossRatio = "All  " + userdata.gamesPlayed + " games played won. Good job!";
		}
		else {
			var winLossRatio = ((Math.floor(userdata.gamesWon / userdata.gamesLost * 100))/100) + " wins per 1 loss";
		}
	}
	else {
		pctWins = "No games played";
		pctTied = "No games played"
		pctLost = "No games played";
		winLossRatio = "No games played";
	}
	
	// fill them in
	pctWinSpan.innerHTML = pctWins;
	pctTiedSpan.innerHTML = pctTied;
	pctLossSpan.innerHTML = pctLost;
	winLossRatioSpan.innerHTML = winLossRatio;
	
	// hook up name change submission button
    document.querySelector('#renameSubmit').addEventListener("click", function(e) {
        e.preventDefault();
		var newName = document.querySelector("#newName").value;
		
        if (newName == '') {
            return false;
        }
    
        sendAjax($("#renameForm").attr("action"), $("#renameForm").serialize());
        return false;
    });
}

window.addEventListener("load", fillStats);