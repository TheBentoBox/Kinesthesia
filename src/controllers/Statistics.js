var models = require('../models');

var Statistics = models.Statistics;

// Updates a user's statistics
var updateStats = function(req, res) {
	
	// Attempt to return a page which displays the user's account stats
	Statistics.StatisticsModel.findByOwner(req.session.account._id, function(err, docs) {
		
		// catch errors updating data
		if (err) {
			console.log(err);
			return res.status(400).json({ error: "An error occurred while updating user statistics" });
		}
		
		// catch errors retrieving stats
		if (!docs) {
            return res.status(400).json({ error: "No statistics found for that user" });
        }
		
		// increment number of games played
		++docs.gamesPlayed;
		
		// add to appropriate stat for wins or losses
		if (req.body.status === "won") {
			++docs.gamesWon;
		}
		else {
			++docs.gamesLost;
		}
		
		// save the updates
		docs.save(function(err) {
			// catch errors with update
			if (err) {
				console.log(err);
				return res.status(400).json({ error:"An error occurred while saving user statistics" });
			}
			
			// good to go
			return res.status(200);
		});
	});
};

module.exports.updateStats = updateStats;