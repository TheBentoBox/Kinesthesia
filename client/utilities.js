"use strict";

var KEY = {					// "enum" equating keycodes to names (e.g. keycode 32 = spacebar)
	TAB: 9,
	SPACE: 32,
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40,
	ONE: 49,
	TWO: 50,
	THREE: 51,
	FOUR: 52,
	FIVE: 53,
	SIX: 54,
	A: 65,
	C: 67,
	D: 68,
	E: 69,
	H: 72,
	P: 80,
	Q: 81,
	R: 82,
	S: 83,
	W: 87,
	X: 88,
	Z: 90
};

// get mouse pos on canvas
function getMouse(e){
	var mouse = {position: {}}
	mouse.position = Vector(e.pageX - e.target.offsetLeft, e.pageY - e.target.offsetTop);
	return mouse;
};

// returns random within a range
function rand(min, max) {
  	return Math.random() * (max - min) + min;
};

// returns a value that is constrained between min and max (inclusive)
function clamp(val, min, max){
	return Math.max(min, Math.min(max, val));
};

// fills a text with correct CSS and cleans up after itself
function fillText(ctx, string, x, y, css, color) {
	ctx.save();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = css;
	ctx.fillStyle = color;
	ctx.fillText(string, x, y);
	ctx.restore();
};

// fills a text with correct CSS and cleans up after itself
function fillTextAligned(ctx, string, x, y, css, color) {
	ctx.save();
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.font = css;
	ctx.fillStyle = color;
	ctx.fillText(string, x, y);
	ctx.restore();
};

 // activate fullscreen
function requestFullscreen(element) {
	if (element.requestFullscreen) {
	  element.requestFullscreen();
	} else if (element.mozRequestFullscreen) {
	  element.mozRequestFullscreen();
	} else if (element.mozRequestFullScreen) { 
	  element.mozRequestFullScreen();
	} else if (element.webkitRequestFullscreen) {
	  element.webkitRequestFullscreen();
	}
	// no response if unsupported
};

// This gives Array a randomElement() method
Array.prototype.randomElement = function(){
	return this[Math.floor(Math.random() * this.length)];
}

// HELPER: gets next key in a JSON object
// from StackOverflow: http://stackoverflow.com/questions/12505598/get-next-key-value-pair-in-an-object
function next(db, key) {
	// sort through and find the key after
	var found = false; 
	//console.log(key);
	for(var k in db){
		//console.log(k);
		if (found) { return db[k]; }
		if (db[k] == key) { found = true; }
	}
	
	// if we reach here and found is true, then we found our key but it was the last one
	// so we'll grab the first one
	if (found) for (var k in db) return db[k];
}

// HELPER: gets the previous key in a JSON object
function previous(db, key) {
	// sort through and find the key after
	var last = undefined; 
	for(var k in db){
		if (db[k] == key) { if (last) return db[last]; }
		last = k;
	}
	
	// if we reach here, then we found our key but it was when last wasn't set
	// this means our key was first, so return the last one
	return db[last];
};

// Helper: a basic x/y vector constructor for use in utilities/window manager	
function Vector(x, y) {
	return {
		x: x,
		y: y
	};
}
