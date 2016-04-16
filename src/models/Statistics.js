// Import libraries
var mongoose = require('mongoose');
var _ = require('underscore');

// The account statistics database model
var StatisticsModel;

// Create the schema to hold account userdata in the database
var StatisticsSchema = new mongoose.Schema ({
	owner: {
		type: mongoose.Schema.ObjectId,
		required: true,
		ref: 'Account'
	},
	
	createdData: {
		type: Date,
		default: Date.now
	},
	
	gamesPlayed: {
		type: Number,
		min: 0,
		default: 0,
	},
	
	gamesWon: {
		type: Number,
		min: 0,
		default: 0
	},
	
	gamesLost: {
		type: Number,
		min: 0,
		default: 0
	}
});

// API to return a standard account stats information object
StatisticsSchema.methods.toAPI = function() {
	return {
		createdData: this.createdData,
		gamesPlayed: this.gamesPlayed,
		gamesWon: this.gamesWon,
		gamesLost: this.gamesLost
	};
};

// Finds statistics object based on an account ID
StatisticsSchema.statics.findByOwner = function(ownerId, callback) {
	
	var search = {
		owner: mongoose.Types.ObjectId(ownerId)
	};
	
	return StatisticsModel.findOne(search).select("createdData gamesPlayed gamesWon gamesLost").exec(callback);
};

// Finds an exact matching statistics object
StatisticsSchema.statics.findStatistics = function(ownerId, matchingStatistics, callback) {
	
	// create the search query object
	var search = {
		owner: mongoose.Types.ObjectId(ownerId),
		createdData: matchingStatistics.createdData,
		gamesPlayed: matchingStatistics.gamesPlayed,
		gamesWon: matchingStatistics.gamesWon,
		gamesLost: matchingStatistics.gamesLost
	};
	
	// return the exact statistics object, if one is found
	return StatisticsModel.findOne(search).select("createdData gamesPlayed gamesWon gamesLost").exec(callback);
};

// Apply the schema to the model
StatisticsModel = mongoose.model('Statistics', StatisticsSchema);

// Export the model and schema
module.exports.StatisticsModel = StatisticsModel;
module.exports.StatisticsSchema = StatisticsSchema;