// Load in the controllers
var controllers = require('./controllers');
var mid = require('./middleware');

// Main routing function
var router = function(app) {
	
	app.get("/login", mid.requiresSecure, mid.requiresLogout, controllers.Account.loginPage);
	app.post("/login", mid.requiresSecure, mid.requiresLogout, controllers.Account.login);
	app.get("/signup", mid.requiresSecure, mid.requiresLogout, controllers.Account.signupPage);
	app.post("/signup", mid.requiresSecure, mid.requiresLogout, controllers.Account.signup);
	app.get("/logout", mid.requiresLogin, controllers.Account.logout);
	app.get("/game", mid.requiresLogin, controllers.Account.gamePage);
	app.get("/account", mid.requiresLogin, controllers.Account.accountPage);
	app.post("/updateStats", mid.requiresLogin, controllers.Statistics.updateStats);
	app.get("/usersOnline", mid.requiresLogin, controllers.Account.onlinePage);
	app.post("/renamePlayer", mid.requiresLogin, controllers.Account.renamePlayer);
	app.get("/", mid.requiresSecure, mid.requiresLogout, controllers.Account.loginPage);
};

// Export the routing function
module.exports = router;