// Redirect users without an account session to the home page
var requiresLogin = function(req, res, next) {

	if (!req.session.account) {
		return res.redirect('/');
	}
	
	next();
};

// Redirect logged in users to the app page
var requiresLogout = function(req, res, next) {
	
	if (req.session.account) {
		return res.redirect('/account');
	}
	
	next();
};

// Make sure all connections come in through https for security
var requiresSecure = function(req, res, next) {
	
	if (req.headers['x-forwarded-proto'] != 'https') {
		return res.redirect('https://' + req.hostname + req.url);
	}
	
	next();
};

// A security bypass for when the app is used locally
var bypassSecure = function(req, res, next) {
	next();
};


//== EXPORTS ==//
module.exports.requiresLogin = requiresLogin;
module.exports.requiresLogout = requiresLogout;
// export correct function based on environment
if (process.env.NODE_ENV === "production") {
	module.exports.requiresSecure = requiresSecure;
}
else {
	module.exports.requiresSecure = bypassSecure;
}