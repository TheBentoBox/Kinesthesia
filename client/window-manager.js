 // window-manager.js
"use strict";
// if game exists use the existing copy
// else create a new object literal
var game = game || {};

game.windowManager = (function(){
	console.log("Loaded window-manager.js module");
	var canvas;  // reference to game's canvas
	var ctx;     // 2D canvas context
	
	var uiElements = [];			// UI elements on the screen
	// FUNCTION: find named object in array
	uiElements.find = function(name){
		for(var i=0; i < this.length; i++){
			if(this[i].name == name){return this[i]};
		};
	};
	
	// FUNCTION: initalize canvas variables for window manager
	function init() {
		canvas = document.querySelector("#UI");	
		ctx = canvas.getContext("2d");				
		
		canvas.addEventListener("mousedown", checkMouse);	// click event to check mouse on UI
		canvas.addEventListener("touchstart", checkMouse);	// tap event to check touch on UI
		
		updateAndDraw();
	}
	
	// FUNCTION: update and draw window
	function updateAndDraw(trackers) {
		for (var i=0; i < uiElements.length; i++){
			uiElements[i].updateAndDraw(trackers);
		}
	}
	
	// FUNCTION: check clicks on UI
	function checkMouse(e){
		var mouse = getMouse(e);	// mouse position
		var elem;					// UI element
		var but;					// button
		var clicked = false;
		
		// check if any UI elements were clicked
		for(var i=0; i < uiElements.length; i++){
			elem = uiElements[i];
			//console.log("Element bounds: " + elem.position.x + ", " + elem.position.y + ", " + (elem.position.x + elem.size.x) + ", " + (elem.position.y + elem.size.y));
			if(mouse.position.x >= elem.position.x && mouse.position.x <= (elem.position.x + elem.bounds.x) && mouse.position.y >= elem.position.y && mouse.position.y <= (elem.position.y + elem.bounds.y) && elem.isActive){
				clicked = true;
				// check if any buttons were clicked inside the clicked element
				for(var j=0; j < elem.subElements.length; j++){
					but = elem.subElements[j];
					// attempt to call the element's click event if it has one (meaning it's a button)
					if (but.onClick != undefined && mouse.position.x >= elem.position.x + but.offset.x && mouse.position.x <= elem.position.x + but.offset.x + but.bounds.x && mouse.position.y >= elem.position.y + but.offset.y && mouse.position.y <= elem.position.y + but.offset.y + but.bounds.y && but.isActive){
						but.onClick();
						break;
					}
				}
				break;
			}
		}
		//console.log(clicked);
		return clicked;
	}
	
	// FUNCTION: make new UI object
	function makeUI(name, xPos, yPos, width, height) {
		uiElements.push(new UI(name, xPos, yPos, width, height));
	}
	
	// FUNCTION: make a new button
	function makeButton(uiName, butName, offsetX, offsetY, width, height, clickEvent){
		uiElements.find(uiName).subElements.push(new Button(uiName, butName, offsetX, offsetY, width, height, clickEvent));
	}
	
	// FUNCTION: make a new bar
	function makeBar(uiName, barName, offsetX, offsetY, width, height, tgtVar, tgtMax, tgtMin){
		uiElements.find(uiName).subElements.push(new Bar(uiName, barName, offsetX, offsetY, width, height, tgtVar, tgtMax, tgtMin));
	}
	
	// FUNCTION: make a new text box
	function makeText(uiName, textName, offsetX, offsetY, width, height, string, css, color){
		uiElements.find(uiName).subElements.push(new Text(uiName, textName, offsetX, offsetY, width, height, string, css, color));
	}
	
	// FUNCTION: make a new image
	function makeImage(uiName, imageName, offsetX, offsetY, width, height, image){
		uiElements.find(uiName).subElements.push(new ImageBox(uiName, imageName, offsetX, offsetY, width, height, image));
	}
	
	// FUNCTION: modify UI variables
	function modifyUI(uiName, varName, args){
		var elem = uiElements.find(uiName);
		switch(varName){
			case("all"):
				elem.setName(args.name);
				elem.setPosition(args.xPos, args,yPos);
				elem.setBounds(args.width, args.height);
				elem.setBorder(args.color, args.width);
				elem.setFill(args.color);
				elem.setImage(args.image);
				for(var i=0; i < this.subElements.length; i++){
					subElements[i].updatePosition();
				}
				break;
			case("name"):
				elem.setName(args.name);
				break;
			case("position"):
				elem.setPosition(args.xPos, args,yPos);
				for(var i=0; i < this.subElements.length; i++){
					subElements[i].updatePosition();
				}
				break;
			case("bounds"):
				elem.setBounds(args.width, args.height);
				break;
			case("border"):
				elem.setBorder(args.color, args.width);
				break;
			case("fill"):
				elem.setFill(args.color);
				break;
			case("image"):
				elem.setImage(args.image);
				break;
		}
	}
	
	// FUNCTION: toggle UI
	function toggleUI(name){
		uiElements.find(name).toggleActive();
	}
	
	// FUNCTION: forcibly deactivates UI element
	function deactivateUI(name){
		if (name === "all")
			for (var i = 0; i < uiElements.length; ++i)
				uiElements[i].deactivate();
		else
			uiElements.find(name).deactivate();
	};
	
	// FUNCTION: forcibly activate UI element
	function activateUI(name){
		if (name === "all")
			for (var i = 0; i < uiElements.length; ++i)
				uiElements[i].activate();
		else
			uiElements.find(name).activate();
	};
		
	// FUNCTION: toggle whether UI pauses game when active
	function toggleUIPausing(name){
		uiElements.find(name).togglePause();
	}
	
	// FUNCTION: forcibly activate UI pausing
	function activateUIPausing(name){
		uiElements.find(name).activatePause();
	};
	
	// FUNCTION: forcibly deactivate UI pausing
	function deactivateUIPausing(name){
		uiElements.find(name).deactivatePause();
	};
	
	// FUNCTION: toggle element
	function toggleElement(uiName, elemName){
		uiElements.find(uiName).subElements.find(elemName).toggleActive();
	}
	
	// FUNCTION: forcibly deactivate subelement
	function deactivateElement(uiName, elemName){
		uiElements.find(uiName).subElements.find(elemName).deactivate();
	}
	
	// FUNCTION: forcibly activate subelement
	function activateElement(uiName, elemName){
		uiElements.find(uiName).subElements.find(elemName).activate();
	}
	
	// FUNCTION: modify button variables
	function modifyButton(uiName, buttonName, varName, args){
		var but = uiElements.find(uiName).subElements.find(buttonName);
		switch(varName){
			case("all"):
				but.setName(args.name);
				but.setOffset(args.xOff, args.yOff);
				but.setBounds(args.width, args.height);
				but.setBorder(args.color, args.width);
				but.setFill(args.color);
				but.setImage(args.image);
				but.setText(args.string, args.css, args.color);
				but.setClick(args.click);
				but.setHover(args.hover);
				break;
			case("name"):
				but.setName(args.name);
				break;
			case("offset"):
				but.setOffset(args.xOff, args.yOff);
				break;
			case("position"):
				but.setPosition(args.xPos, args.yPos);
				break;
			case("bounds"):
				but.setBounds(args.width, args.height);
				break;
			case("border"):
				but.setBorder(args.color, args.width);
				break;
			case("fill"):
				but.setFill(args.color);
				break;
			case("image"):
				but.setImage(args.image);
				break;
			case("text"):
				but.setText(args.string, args.css, args.color);
				break;
			case("click"):
				but.setClick(args.click);
				break;
			case("hover"):
				but.setHover(args.hover);
				break;
		}
	}
	
	//FUNCTION: modify status bar variables
	function modifyBar(uiName, barName, varName, args){
		var bar = uiElements.find(uiName).subElements.find(barName);
		switch(varName){
			case("all"):
				bar.setName(args.name);
				bar.setOffset(args.xOff, args,yOff);
				bar.setBounds(args.width, args.height);
				bar.setBorder(args.color, args.width);
				bar.setFill(args.color);
				bar.setImage(args.image);
				bar.setText(args.string, args.css, args.color);
				bar.setTarget(args.tgtVar, args.tgtMax, args.tgtMin);
				break;
			case("name"):
				bar.setName(args.name);
				break;
			case("offset"):
				bar.setOffset(args.xOff, args,yOff);
				break;
			case("position"):
				but.setPosition(args.xPos, args.yPos);
				break;
			case("bounds"):
				bar.setBounds(args.width, args.height);
				break;
			case("border"):
				bar.setBorder(args.color, args.width);
				break;
			case("fill"):
				bar.setFill(args.backColor, args.foreColor);
				break;
			case("image"):
				bar.setImage(args.backImage, args.foreImage);
				break;
			case("text"):
				bar.setText(args.string, args.css, args.color);
				break;
			case("target"):
				bar.setTarget(args.tgtVar, args.tgtMax, args.tgtMin);
				break;
		}
	}
	
	// FUNCTION: modify text variables
	function modifyText(uiName, textName, varName, args){
		var text = uiElements.find(uiName).subElements.find(textName);
		switch(varName){
			case("all"):
				text.setName(args.name);
				text.setOffset(args.xOff, args,yOff);
				text.setBounds(args.width, args.height);
				text.setBorder(args.color, args.width);
				text.setFill(args.color);
				text.setImage(args.image);
				text.setText(args.string, args.css, args.color);
				text.setTarget(args.targets);
				break;
			case("name"):
				text.setName(args.name);
				break;
			case("offset"):
				bar.setOffset(args.xOff, args,yOff);
				break;
			case("position"):
				but.setPosition(args.xPos, args.yPos);
				break;
			case("bounds"):
				bar.setBounds(args.width, args.height);
				break;
			case("border"):
				text.setBorder(args.color, args.width);
				break;
			case("padding"):
				text.setPadding(args.top, args.right, args.bottom, args.left, args.line);
			case("fill"):
				text.setFill(args.color);
				break;
			case("image"):
				text.setImage(args.image);
				break;
			case("text"):
				text.setText(args.string, args.css, args.color);
				break;
			case("target"):
				text.setTarget(args.targets);
		}
	}
	
	// FUNCTION: modify image variables
	function modifyImage(uiName, imageName, varName, args){
		var img = uiElements.find(uiName).subElements.find(imageName);
		switch(varName){
			case("all"):
				img.setName(args.name);
				img.setOffset(args.xOff, args.yOff);
				img.setBounds(args.width, args.height);
				img.setBorder(args.color, args.width);
				img.setFill(args.color);
				img.setImage(args.image);
				break;
			case("name"):
				img.setName(args.name);
				break;
			case("offset"):
				img.setOffset(args.xOff, args.yOff);
				break;
			case("position"):
				img.setPosition(args.xPos, args.yPos);
				break;
			case("bounds"):
				img.setBounds(args.width, args.height);
				break;
			case("border"):
				img.setBorder(args.color, args.width);
				break;
			case("fill"):
				img.setFill(args.color);
				break;
			case("image"):
				img.setImage(args.image);
				break;
		}
	}
	
	// CLASS: user interface object
	var UI = function(name, xPos, yPos, width, height) {
		// element name
		this.name = name;
		
		// base position of UI element
		this.position = new Vector(xPos, yPos);
		
		// element bounds
		this.bounds = new Vector(width, height);
		
		// border styling
		this.border = {
			color: "",
			width: 0,
		};
		
		this.fillColor = "";			// background fill color
		this.image = new Image();		// background image
		this.isActive = false; 			// if the element is active and displayed
		this.doesPause = false; 		// if the element pauses the game when active
		
		this.subElements = [];
		// FUNCTION: find named object in array
		this.subElements.find = function(name){
			for(var i=0; i < this.length; i++){
				if(this[i].name == name){return this[i]};
			};
		};
		
		// UI MODIFIERS
		// MUTATOR: set name
		this.setName = function(newName){
			this.name = newName;
		};
		
		// MUTATOR: set UI position
		this.setPosition = function(xPos, yPos){
			this.position = new Vector(xPos, yPos);
		};
		
		// MUTATOR: set up bounding rectangle
		this.setBounds = function(width, height){
			this.bounds = new Vector(width, height);
		};
		
		// MUTATOR: set border
		this.setBorder = function(color, width){
			this.border = {color:color, width:width};	// set color to "" to stop border drawing
		};
		
		// MUTATOR: set fill
		this.setFill = function(color){
			this.fillColor = color;		// set to "" to stop color fill
		};
		
		// MUTATOR: set background image
		this.setImage = function(image){
			this.image = image;		// set to null to stop image drawing
		};
		
		// FUNCTION: toggle whether element is active
		this.toggleActive = function(){
			this.isActive = !this.isActive;
		};
		
		// FUNCTION: forcibly deactivates the element
		this.deactivate = function(){
			this.isActive = false;
		};
		
		// FUNCTION: forcibly activate the element
		this.activate = function(){
			this.isActive = true;
		};
		
		// FUNCTION: toggle whether element pauses game
		this.togglePause = function(){
			this.doesPause = !this.doesPause;
		};
		
		// FUNCTION: forcibly activate pausing
		this.activatePause = function(){
			this.doesPause = true;
		};
		
		// FUNCTION: forcibly deactivate pausing
		this.deactivatePause = function(){
			this.doesPause = false;
		};
		// UI MODIFIERS
		
		// FUNCTION: update and draw UI element
		this.updateAndDraw = function(trackers){
			if (this.isActive){
				// fill color
				if (this.fillColor != ""){
					ctx.fillStyle = this.fillColor;
					ctx.fillRect(this.position.x, this.position.y, this.bounds.x, this.bounds.y);
				}
				
				// stroke border
				if(this.border.color != ""){
					ctx.strokeStyle = this.border.color;
					ctx.lineWidth = this.border.width;
					ctx.strokeRect(this.position.x, this.position.y, this.bounds.x, this.bounds.y);
				}
				
				// draw image
				if(this.image.src != null && this.image.src != "" && this.image.src != undefined) {
					ctx.drawImage(this.image, this.position.x, this.position.y);
				}
				
				// update tracked variables
				for(var i=0; i < trackers.length; i++){
					var elem = this.subElements.find(trackers[i].name);
					if(elem != null){
						elem.trackers = trackers[i].value;
						bar.target.value = trackers[i].value;
					}
				}
				
				// update and draw elements
				for(var i=0; i < this.subElements.length; i++){
					this.subElements[i].updateAndDraw();
				}
			}		
		};
	};
	
	// CLASS: button object
	var Button = function(parentName, name, offsetX, offsetY, width, height, clickEvent) {
		// reference names
		this.parentName = parentName;
		this.name = name;
		
		// offset from base UI element
		this.offset = new Vector(offsetX, offsetY);
		
		// position of the parent element
		this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
		
		// global position of subelement
		this.position = new Vector(this.parPosition.x + this.offset.x, this.parPosition.y + this.offset.y);
		
		// button bounds
		this.bounds = new Vector(width, height);
		
		// border styling
		this.border = {
			color: "",
			width: 0,
		};
		
		this.fillColor = "gray";		// background fill color
		this.image = new Image();		// background image
		this.isActive = true; 			// if the element is active and displayed
		
		// text on button
		this.text = {
			string: "",
			css: "",
			color: "",
		};
		
		this.onClick = clickEvent;		// event to fire on click
		this.onHover = undefined;		// event to fire on hover
		this.imageLoaded = false;
		
		this.image.onload = function() { this.imageLoaded = true; }
		
		// FUNCTION: update and draw button if active
		this.updateAndDraw = function() {
			if (this.isActive && (this.imageLoaded || this.image.src === "")) {
				// fill color
				if(this.fillColor != ""){
					ctx.fillStyle = this.fillColor;
					ctx.fillRect(this.position.x, this.position.y, this.bounds.x, this.bounds.y);
				}
				
				// stroke border
				if(this.border.color != ""){
					ctx.strokeStyle = this.border.color;
					ctx.lineWidth = this.border.width;
					ctx.strokeRect(this.position.x, this.position.y, this.bounds.x, this.bounds.y);
				}
				
				// draw image
				if(this.image != undefined && this.image != null && this.image.src != undefined && this.image.src != null && this.image.src != ""){
					if (!this.logged) { this.logged= true;
					console.log(this.image);}
					ctx.drawImage(this.image, this.position.x, this.position.y);
				}
				
				// print text
				if (this.text.string != "") {
					fillText(ctx, this.text.string, (this.position.x + this.bounds.x / 2), (this.position.y + this.bounds.y / 2), this.text.css, this.text.color);
				}
			}
		}
		
		//{ BUTTON FUNCTIONS
		// MUTATOR: set name
		this.setName = function(newName){
			this.name = newName;
		}
		
		// MUTATOR: set offset
		this.setOffset = function(xOffset, yOffset){
			this.offset = new Vector(offsetX, offsetY);
			this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
			this.position = new Vector(parPosition.x + offset.x, parPosition.y + offset.y);
		}
		
		// MUTATOR: set position
		this.setPosition = function(xPos, yPos){
			this.position = new Vector(xPos, yPos);
			this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
			this.offset = new Vector(position.x - parPosition.x, position.y - parPosition.y);
		}
		
		// FUNCTION: update position from parent
		this.updatePos = function(){
			this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
			this.position = new Vector(parPosition.x + offset.x, parPosition.y + offset.y);
		}
		
		// MUTATOR: set bounds
		this.setBounds = function(width, height){
			this.bounds = new Vector(width, height);
		}
		
		// MUTATOR: set border styling
		this.setBorder = function(color, width){
			this.border = {color:color, width:width};
		}
		
		// MUTATOR: set color
		this.setFill = function(color){
			this.fillColor = color;
		}
		
		// MUTATOR: set image
		this.setImage = function(image){
			this.image = image;
		}
		
		// MUTATOR: set text
		this.setText = function(string, css, color){
			this.text = {string:string, css:css, color:color};
		}
		
		// MUTATOR: set click event
		this.setClick = function(event){
			this.onClick = event;
		}
		
		// MUTATOR: set hover event
		this.setHover = function(event){
			this.onHover = event;
		}
		
		// FUNCTION: toggle whether is active
		this.toggleActive = function(){
			this.isActive = !this.isActive;
		}
		
		// FUNCTION: forcibly deactivates the element
		this.deactivate = function(){
			this.isActive = false;
		};
		
		// FUNCTION: forcibly activate the element
		this.activate = function(){
			this.isActive = true;
		};
		//} BUTTON FUNCTIONS
	};
	
	// CLASS: status bar object
	var Bar = function(parentName, name, offsetX, offsetY, width, height, tgtVar, tgtMax, tgtMin) {
		// reference name
		this.parentName = parentName;
		this.name = name;
		
		// offset from base UI element
		this.offset = new Vector(offsetX, offsetY);
		
		// position of the parent element
		this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
		
		// global position of subelement
		this.position = new Vector(this.parPosition.x + this.offset.x, this.parPosition.y + this.offset.y);
		
		// bar bounds
		this.bounds = new Vector(width, height);
		
		// border styling
		this.border = {
			color: "",
			width: 0,
		};
		
		// fill colors
		this.color = {
			back: "gray",
			fore: "green",
		}
		
		// fill images
		this.image = {
			back: new Image(),
			fore: new Image()
		}
		
		this.isActive = true; 			// if the element is active and displayed
		
		// value of tracked variable
		this.trackers = tgtVar;
		
		// variable bounds to be tracked by bar
		this.target = {
			max: tgtMax,
			min: tgtMin,
		}
		
		// text on bar
		this.text = {
			string: "",
			css: "",
			color: "",
		};
		
		// FUNCTION: update and draw bar if active
		this.updateAndDraw = function() {
			if (this.isActive){	
				// percent fill of bar
				var percent = clamp(this.trackers / (this.target.max - this.target.min), 0.0, 1.0);
				
				// fill background color
				if(this.color.back != ""){
					ctx.fillStyle = this.color.back;
					ctx.fillRect(this.position.x, this.position.y, this.bounds.x, this.bounds.y);
				}
				
				// stroke border
				if(this.border.color != ""){
					ctx.strokeStyle = this.border.color;
					ctx.lineWidth = this.border.width;
					ctx.strokeRect(this.position.x, this.position.y, this.bounds.x, this.bounds.y);
				}
				
				// fill foreground color
				if(this.color.fore != ""){
					ctx.fillStyle = this.color.fore;
					ctx.fillRect(this.position.x, this.position.y, this.bounds.x * percent, this.bounds.y);
				}
				
				// draw background image
				if(this.image.back.src != null){
					ctx.drawImage(this.image.back, this.position.x, this.position.y);
				}
				
				// draw foreground image
				if(this.image.fore.src != ""){
					ctx.drawImage(this.image.fore, 0, 0, this.bounds.x * percent, this.bounds.y, this.position.x, this.position.y, this.bounds.x * percent, this.bounds.y);
				}
				// print text
				if(this.text.string != "") {
					fillText(ctx, this.text.string, (this.position.x + this.bounds.x / 2), (this.position.y + this.bounds.y / 2), this.text.css, this.text.color);
				}
			}
		}
		
		//{ BAR FUNCTIONS
		// MUTATOR: set name
		this.setName = function(newName){
			this.name = newName;
		}
		
		// MUTATOR: set offset
		this.setOffset = function(xOffset, yOffset){
			this.offset = new Vector(offsetX, offsetY);
			this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
			this.position = new Vector(parPosition.x + offset.x, parPosition.y + offset.y);
		}
		
		// MUTATOR: set position
		this.setPosition = function(xPos, yPos){
			this.position = new Vector(xPos, yPos);
			this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
			this.offset = new Vector(position.x - parPosition.x, position.y - parPosition.y);
		}
		
		// FUNCTION: update position from parent
		this.updatePos = function(){
			this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
			this.position = new Vector(parPosition.x + offset.x, parPosition.y + offset.y);
		}
		
		// MUTATOR: set bounds
		this.setBounds = function(width, height){
			this.bounds = new Vector(width, height);
		}
		
		// MUTATOR: set border styling
		this.setBorder = function(color, width){
			this.border = {color:color, width:width};
		}
		
		// MUTATOR: set color
		this.setFill = function(backColor, foreColor){
			this.color = {back: backColor, fore: foreColor};
		}
		
		// MUTATOR: set image
		this.setImage = function(backImage, foreImage){
			this.image.back = backImage;
			this.image.fore = foreImage;
		}
		
		// MUTATOR: set text
		this.setText = function(string, css, color){
			this.text = {string:string, css:css, color:color};
		}
		
		// MUTATOR: set target
		this.setTarget = function(tgtVar, tgtMax, tgtMin){
			this.trackers = tgtVar;
			this.target = {max: tgtMax, min: tgtMin};
		}
		
		// FUNCTION: toggle whether is active
		this.toggleActive = function(){
			this.isActive = !this.isActive;
		}
		
		// FUNCTION: forcibly deactivates the element
		this.deactivate = function(){
			this.isActive = false;
		};
		
		// FUNCTION: forcibly activate the element
		this.activate = function(){
			this.isActive = true;
		};
		//} BAR FUNCTIONS
	}

	// CLASS: text box object
	var Text = function(parentName, name, offsetX, offsetY, width, height, string, css, color) {
		// reference name
		this.parentName = parentName;
		this.name = name;
		
		// offset from base UI element
		this.offset = new Vector(offsetX, offsetY);
		
		// position of the parent element
		this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
		
		// global position of subelement
		this.position = new Vector(this.parPosition.x + this.offset.x, this.parPosition.y + this.offset.y);
		
		// text box bounds
		this.bounds = new Vector(width, height);
		if (this.bounds.x === "default") this.bounds.x = ctx.measureText(string).width;
		if (this.bounds.y === "default") this.bounds.y = this.bounds.x*1.5;
		
		// border styling
		this.border = {
			color: "",
			width: 0,
		};
		
		// text padding
		this.padding = {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
			line: 0,
		};
		
		// fill colors
		this.color = "rgba(0, 0, 0, 0)";
		
		// fill images
		this.image = new Image();
		
		// if the element is active and displayed
		this.isActive = true; 
		
		// text
		this.text = {
			string: string,
			output: string,
			css: css,
			color: color,
		};
		
		// data to track in formatted string
		this.trackers = [];
		
		// make sure it doesn't draw an unloaded image
		this.imageLoaded = false;
		this.image.onload = function() { this.imageLoaded = true; }
		
		// FUNCTION: update and draw if active
		this.updateAndDraw = function() {
			if (this.isActive && (this.imageLoaded || this.image.src === "")){
				// fill background color
				if(this.color != "") {
					ctx.fillStyle = this.color;
					ctx.fillRect(this.position.x, this.position.y, this.bounds.x, this.bounds.y);
				}
				
				// stroke border
				if(this.border.color != ""){
					ctx.strokeStyle = this.border.color;
					ctx.lineWidth = this.border.width;
					ctx.strokeRect(this.position.x, this.position.y, this.bounds.x, this.bounds.y);
				}
				
				// draw background image
				if(this.image != undefined && this.image != null && this.image.src != undefined && this.image.src != null && this.image.src != ""){
					ctx.drawImage(this.image, this.position.x, this.position.y);
				}
				// update formatted text
				if(this.trackers.length != 0){
					var trackIndex = 0;
					var str = this.text.string;
					for(var i=0; i < str.length-1; i++){
						if(str.charAt(i) == "%" && str.charAt(i + 1) == "v"){
							str = (str.substr(0,i) + this.trackers[trackIndex] + str.substr(i+2));
							i += this.trackers[trackIndex].length;
							trackIndex++;
						}
					}
					this.text.output = str;
				}
				
				// print text
				if(this.text.output != "") {
					// save canvas context and set up drawing variables
					ctx.save();
					ctx.textAlign = "left";
					ctx.textBaseline = "top";
					ctx.font = this.text.css;
					ctx.fillStyle = this.text.color;
					
					// prepare variables for drawing string with wrapping
					var str = this.text.output;
					var line = 0;
					var xPos = 0;
					var height = (ctx.measureText(str).width/str.length) * 1.5;
					
					// loop through letters
					for(var i = 0; i < str.length; i++){
						// if currently looped character is a space or endline, or we've reached the end of the string, draw the word
						if (str.charAt(i) == " " || (str.charAt(i) == "%" && str.charAt(i+1) == "n") || i == str.length - 1) {
							// get the current word
							var subtext = ((str.charAt(i) == "%" && str.charAt(i+1)) ? str.substr(0, i) : str.substr(0, i+1));
							var measured = ctx.measureText(subtext);
							
							// wrap down to next line if the current word:
							// 1 - would go outside the textbox (xPos + it's width > box size - padding)
							// 2 - isn't wider than the textbox on its own (xPos > 0 - only wraps if it's not the first word)
							if (xPos + measured.width > this.bounds.x - this.padding.left - this.padding.right && xPos > 0) {
								++line;
								xPos = 0;
							}
							
							// draw the text
							ctx.fillText(subtext, this.position.x + this.padding.left + xPos, this.position.y + this.padding.top + ((height + this.padding.line)*line));
							// update new line
							if (str.charAt(i) == "%" && str.charAt(i+1) == "n") {
								++line;
								xPos = 0;
								str = str.substr(i+2);
							}
							else {
								// update drawing variables
								xPos += measured.width; // slide draw position over
								str = str.substr(i);    // cut out the word we just drew from the string
							}
							i = 0;					// start at the beginning of the new substring
						}
					}
					ctx.restore();
				}
			}
		};
		
		//{ TEXT FUNCTIONS
		// MUTATOR: set name
		this.setName = function(newName){
			this.name = newName;
		};
		
		// MUTATOR: set offset
		this.setOffset = function(xOffset, yOffset){
			this.offset = new Vector(offsetX, offsetY);
			this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
			this.position = new Vector(parPosition.x + offset.x, parPosition.y + offset.y);
		}
		
		// MUTATOR: set position
		this.setPosition = function(xPos, yPos){
			this.position = new Vector(xPos, yPos);
			this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
			this.offset = new Vector(position.x - parPosition.x, position.y - parPosition.y);
		}
		
		// FUNCTION: update position from parent
		this.updatePos = function(){
			this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
			this.position = new Vector(parPosition.x + offset.x, parPosition.y + offset.y);
		}
		
		// MUTATOR: set bounds
		this.setBounds = function(width, height){
			this.bounds = new Vector(width, height);
		}
		
		// MUTATOR: set border styling
		this.setBorder = function(color, width){
			this.border = {color:color, width:width};
		};
		
		// MUTATOR: set text padding
		this.setPadding = function(top, right, bottom, left, line){
			this.padding = {top:top, right:right, bottom:bottom, left:left, line:line};
		};
		
		// MUTATOR: set color
		this.setFill = function(color){
			this.color = {color: color};
		};
		
		// MUTATOR: set image
		this.setImage = function(image){
			this.image = image;
		};
		
		// MUTATOR: set text
		this.setText = function(string, css, color){
			this.text = {string:string, output:string, css:css, color:color};
		};
		
		// MUTATOR: set targets
		this.setTarget = function(targets){
			this.trackers = targets;
		};
		
		// FUNCTION: toggle if active
		this.toggleActive = function(){
			this.isActive = !this.isActive;
		};
		
		// FUNCTION: forcibly deactivates the element
		this.deactivate = function(){
			this.isActive = false;
		};
		
		// FUNCTION: forcibly activate the element
		this.activate = function(){
			this.isActive = true;
		};
		//} TEXT FUNCTIONS
	}
	
	// CLASS: image object
	var ImageBox = function(parentName, name, offsetX, offsetY, width, height, image) {
		// reference names
		this.parentName = parentName;
		this.name = name;
		
		// offset from base UI element
		this.offset = new Vector(offsetX, offsetY);
		
		// position of the parent element
		this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
		
		// global position of subelement
		this.position = new Vector(this.parPosition.x + this.offset.x, this.parPosition.y + this.offset.y);
		
		// button bounds
		this.bounds = new Vector(width, height);
		
		// border styling
		this.border = {
			color: "",
			width: 0,
		};
		
		this.fillColor = "rgba(0, 0, 0, 0)"; // background fill color
		this.image = image;				// image
		this.isActive = true; 			// if the element is active and displayed
		
		// FUNCTION: update and draw button if active
		this.updateAndDraw = function() {
			if (this.isActive) {
				// fill color
				if(this.fillColor != ""){
					ctx.fillStyle = this.fillColor;
					ctx.fillRect(this.position.x, this.position.y, this.bounds.x, this.bounds.y);
				}
				
				// stroke border
				if(this.border.color != ""){
					ctx.strokeStyle = this.border.color;
					ctx.lineWidth = this.border.width;
					ctx.strokeRect(this.position.x, this.position.y, this.bounds.x, this.bounds.y);
				}
				
				// draw image
				if(this.image.src != null){
					ctx.drawImage(this.image, this.position.x, this.position.y);
				}
			}
		}
		
		//{ IMAGE FUNCTIONS
		// MUTATOR: set name
		this.setName = function(newName){
			this.name = newName;
		}
		
		// MUTATOR: set offset
		this.setOffset = function(xOffset, yOffset){
			this.offset = new Vector(offsetX, offsetY);
			this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
			this.position = new Vector(parPosition.x + offset.x, parPosition.y + offset.y);
		}
		
		// MUTATOR: set position
		this.setPosition = function(xPos, yPos){
			this.position = new Vector(xPos, yPos);
			this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
			this.offset = new Vector(position.x - parPosition.x, position.y - parPosition.y);
		}
		
		// FUNCTION: update position from parent
		this.updatePos = function(){
			this.parPosition = new Vector(uiElements.find(this.parentName).position.x, uiElements.find(this.parentName).position.y);
			this.position = new Vector(parPosition.x + offset.x, parPosition.y + offset.y);
		}
		
		// MUTATOR: set bounds
		this.setBounds = function(width, height){
			this.bounds = new Vector(width, height);
		}
		
		// MUTATOR: set border styling
		this.setBorder = function(color, width){
			this.border = {color:color, width:width};
		}
		
		// MUTATOR: set color
		this.setFill = function(color){
			this.fillColor = color;
		}
		
		// MUTATOR: set image
		this.setImage = function(image){
			this.image = image;
		}
		
		// FUNCTION: toggle whether is active
		this.toggleActive = function(){
			this.isActive = !this.isActive;
		}
		
		// FUNCTION: forcibly deactivates the element
		this.deactivate = function(){
			this.isActive = false;
		};
		
		// FUNCTION: forcibly activate the element
		this.activate = function(){
			this.isActive = true;
		};
		//}
	}
	
	window.addEventListener("load", init);
	
	return {
		init: init,
		updateAndDraw: updateAndDraw,
		checkMouse: checkMouse,
		makeUI: makeUI,
		makeButton: makeButton,
		makeBar: makeBar,
		makeText: makeText,
		makeImage: makeImage,
		modifyUI: modifyUI,
		toggleUI: toggleUI,
		activateUI: activateUI,
		deactivateUI: deactivateUI,
		toggleUIPausing: toggleUIPausing,
		activateUIPausing: activateUIPausing,
		deactivateUIPausing: deactivateUIPausing,
		toggleElement: toggleElement,
		deactivateElement: deactivateElement,
		activateElement: activateElement,
		modifyButton: modifyButton,
		modifyBar: modifyBar,
		modifyText: modifyText,
		modifyImage: modifyImage
	}
}());