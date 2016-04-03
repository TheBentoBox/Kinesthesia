var controllers = require('./controllers');

// connect routes
var router = function(app) {
	app.get('/', controllers.ViewManager.gamePage);
};

module.exports = router;