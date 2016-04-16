var models = require('../models');

var Account = models.Account;
var Statistics = models.Statistics;

var loginPage = function(req, res) {
	res.render('login', { csrfToken: req.csrfToken() });
};

var signupPage = function(req, res) {
	res.render('signup', { csrfToken: req.csrfToken() });
};

var logout = function(req, res) {
	req.session.destroy();
	res.redirect('/');
};

var login = function(req, res) {
	
	// Make sure all fields are filled
	if (!req.body.username || !req.body.pass) {
		return res.status(400).json({error: "RAWR! All fields are required"});
	}
	
	// Authenticate the login
	Account.AccountModel.authenticate(req.body.username, req.body.pass, function(err, account) {
		if (err || !account) {
			return res.status(401).json({error: "Wrong username or password"});
		}
		
		req.session.account = account.toAPI();
		
		res.json({redirect: '/account'});
	});
};

var signup = function(req, res) {
	
	// Make sure all fields are filled
	if (!req.body.username || !req.body.pass || !req.body.pass2) {
		return res.status(400).json({error: "All fields are required before you can continue"});
	}
	
	// Check if passwords match
	if (req.body.pass !== req.body.pass2) {
		return res.status(400).json({error: "The passwords you entered do not match"});
	}
	
	// Generate the account with encrypted salt/hashed password
	Account.AccountModel.generateHash(req.body.pass, function(salt, hash) {
		
		// generate account data from the returned hash/salt
		var accountData = {
			username: req.body.username,
			salt: salt,
			password: hash
		};
		
		// generate the account from the data
		var newAccount = new Account.AccountModel(accountData);
		
		// push account to the database
		newAccount.save(function(err) {
			if (err) {
				console.log(err);
				return res.status(400).json({error: "An error occurred saving your new account"});
			}
			
			req.session.account = newAccount.toAPI();
			
			// now that the account is made and session is started, generate their statistics
			generateAccountStatistics(req);
			
			// send the user to the game page
			res.json({redirect: '/game'});
		});
	});
};

// Generates initial statistics object and ties it to the account
var generateAccountStatistics = function(req) {
	
	// generate stats object data
	var accStatsData = {
		owner: req.session.account._id
	};
	
	// generate the new account stats obj from data above
	var newAccStats = new Statistics.StatisticsModel(accStatsData);
	
	// push new stats object to database
	newAccStats.save(function(err) {
		if (err) {
			console.log(err);
			return res.status(400).json({ error: "An error occurred saving your account statistics" });
		}
	});
};

// Creates the game page
var gamePage = function(req, res) {
	
	// Attempt to return a page which displays the user's account stats
	Statistics.StatisticsModel.findByOwner(req.session.account._id, function(err, docs) {
		
		// catch errors creating the page
		if (err) {
			console.log(err);
			return res.status(400).json({ error: "An error occurred while generating the game page" });
		}
		
		// grab the session username and return it with the account stats
		docs.username = req.session.account.username;
		
		res.render('game', { csrfToken: req.csrfToken(), stats: docs });
	});
};

// Creates the user's account page
var accountPage = function(req, res) {
	
	// Attempt to return a page which displays the user's account stats
	Statistics.StatisticsModel.findByOwner(req.session.account._id, function(err, docs) {
		
		// catch errors creating the page
		if (err) {
			console.log(err);
			return res.status(400).json({ error: "An error occurred while generating the game page" });
		}
		
		// grab the session username and return it with the account stats
		docs.username = req.session.account.username;
		
		res.render('account', { csrfToken: req.csrfToken(), stats: docs });
	});
};

var onlinePage = function(req, res) {
	
	// Attempt to return a page which displays the user's account stats
	Statistics.StatisticsModel.findByOwner(req.session.account._id, function(err, docs) {
		
		// catch errors creating the page
		if (err) {
			console.log(err);
			return res.status(400).json({ error: "An error occurred while generating the user list page" });
		}
		
		// grab the session username and return it with the account stats
		docs.username = req.session.account.username;
		
		res.render('usersOnline', { csrfToken: req.csrfToken(), stats: docs });
	});
};

// when players request a new username
var renamePlayer = function(req, res) {
	
	// Looks for the player's account based on the current session
	Account.AccountModel.findById(req.session.account._id, function(err, docs) {
		// catch errors
		if (err) {
			console.log(err);
            return res.json({ err: err });          
        }

		// update player name to name in database
		docs.username = req.body.name;
		
		// push changes to database
		docs.save(function(err) {
			if (err) {
				console.log(err);
				return res.status(400).json({ error: "An error occurred while renaming a user account" });
			}
			
			req.session.account.username = docs.username;
		
			// reload their account page to reflect the changes
			res.json({ redirect: '/account' });
		});
	});
};

module.exports.loginPage = loginPage;
module.exports.login = login;
module.exports.logout = logout;
module.exports.signupPage = signupPage;
module.exports.signup = signup;
module.exports.onlinePage = onlinePage;
module.exports.gamePage = gamePage;
module.exports.accountPage = accountPage;
module.exports.renamePlayer = renamePlayer;