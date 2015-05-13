"use strict";
var audio = new webkitAudioContext();
function play(pitch,duration) {
	var osc = audio.createOscillator();
	osc.connect(audio.destination);
	osc.frequency.value = pitch;
	osc.start(audio.currentTime);
	osc.stop(audio.currentTime+duration);
}
var canvas;
var context;
var blockSize = 40;
var sm = new SimplexNoise();
var images = [];
images["char1_idle1_l"] = "char1_idle1_l.png";
images["char1_idle2_l"] = "char1_idle2_l.png";
images["char1_idle1_r"] = "char1_idle1_r.png";
images["char1_idle2_r"] = "char1_idle2_r.png";
images["char1_death"] = "char1_death.png";
for (var i = 0; i <= 5; i++) 
	images["lava" + i] = "lava"+i+".png";
images["dirt"] = "dirt.png";

var numLoaded = 0;
var numToBeLoaded = 0;
function joinLoadImages() {
	numLoaded++;
	if (numToBeLoaded == numLoaded) {
		onload();
	}
}
for (var i in images) {
	numToBeLoaded++;
	var tmp = images[i];
	images[i] = new Image();
	images[i].src = "images/" + tmp;
	images[i].onload = joinLoadImages;
}
var world = new function() {
	this.isWall = function(x,y) {
		if (Math.abs(x) <1.5 && Math.abs(y+2) < .5) return 1;
		return Math.pow(Math.abs(x)/25,5)+.3>(1+sm.noise2D(x/7,y/2.5))/2
	}
}();
var camX = 0;
var camY = 0;
function onload() {
	canvas = document.getElementById("canvas");
	context = canvas.getContext('2d');
	function resize() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		context.restore();
		context.restore();
		context.save();
		context.translate(canvas.width / 2, canvas.height / 2);
		context.scale(blockSize, -blockSize);
		context.save();
		setCam(camX, camY);
	}
	context.save();
	function setCam(x,y) {
		camX = x;
		camY = y;
		context.restore();
		context.save();
		context.translate(-camX,-camY);
	}
	context.save();
	context.save();
	resize();
	window.addEventListener("resize", resize);
	
	var fred = new Player(Date.now()/1000);
	var joe = new Player(Date.now()/1000);
	var pete = new Player(Date.now()/1000);
	attachInput(37,39,38,65,fred);
	attachInput(65,68,87,65,joe);
	attachInput(74,76,73,65,pete);
	
	var lava = new Lava(Date.now()/1000);
	
	function animate() {
		context.clearRect(camX-canvas.width/2/blockSize,camY-canvas.height/2/blockSize,canvas.width/blockSize, canvas.height/blockSize);
		fred.update(Date.now()/1000);
		joe.update(Date.now()/1000);
		pete.update(Date.now()/1000);
		lava.update(Date.now()/1000);
		if (lava.height() > fred.pos().y) fred.kill();
		if (lava.height() > joe.pos().y) joe.kill();
		if (lava.height() > pete.pos().y) pete.kill();
		setCam(fred.pos().x*.6,Math.max(fred.pos().y,lava.height()+canvas.height/2/blockSize));
		if (!fred.isDead()) fred.draw();
		if (!joe.isDead()) joe.draw();
		if (!pete.isDead()) pete.draw();
		var halfWidth = Math.ceil(canvas.width/2/blockSize);
		var halfHeight = Math.ceil(canvas.height/2/blockSize);;
		for (var x = -halfWidth+Math.floor(camX); x <= halfWidth+Math.floor(camX); x++) {
			for (var y = -halfHeight+Math.floor(camY); y <= halfHeight+Math.floor(camY); y++) {
				if (world.isWall(x,y)) context.drawImage(images["dirt"],x,y,1,1);
			}
		}
		if (fred.isDead()) fred.draw();
		if (joe.isDead()) joe.draw();
		if (pete.isDead()) pete.draw();
		lava.draw();
		requestAnimationFrame(function(){animate();});
	} animate();
	
}
function Lava(startTime) {
	var h = -50;
	var speed = 1.5;
	var t = startTime;
	this.height = function() {return h};
	this.update = function(time) {
		var dt = time-t;
		speed += dt/100;
		h+=dt*speed;
		
		t = time;
	}
	this.draw = function() {
		var sx = 700/48;
		var sy = 135/48;
		for (var x = Math.floor((camX-canvas.width/2/blockSize)/sx)*sx; x <= camX+canvas.width/2/blockSize; x += sx)
			context.drawImage(images["lava"+(Math.floor(Date.now()/100)%6)],x,h,sx,sy);
	}
}
function Player(startTime) {
	var g/*ravity*/ = -30;
	var jg/*jump gravity*/ = -10;
	var jumpState = 0; /* 0: grounded, 1: jumping, 2: free falling*/
	var jumpTime = .7;
	var jumpStart = 0;
	var a/*cceleration*/ = {a/*ir*/: 10, g/*round*/: 30};
	var d/*rag*/ = {a/*ir*/: .2, g/*round*/: .2}
	var slide = .005;
	var p/*osition*/ = {x:0, y:0};
	var s/*ize*/ = {x:20/24, y:20/24};
	var v/*elocity*/ = {x: 0, y: 0};
	var c/*ontrols*/ = {left: false, right: false, jump: false, action: false};
	var jumpThisFrame = false;
	var t/*ime*/ = startTime;
	var dead = false;
	this.pos = function() { return {x:p.x, y:p.y} };
	this.update = function(time) {
		if (!dead) {
			var dt = Math.min(time-t,.1);
			if (c.left)
				if (jumpState >= 1) v.x-= dt*a.a;
				else v.x-= dt*a.g;
			if (c.right)
				if (jumpState >= 1) v.x+= dt*a.a;
				else v.x+= dt*a.g;
			if (jumpThisFrame && jumpState == 0) {play(440*1.5,.1);v.y += 12; jumpThisFrame = false; jumpState = 2; jumpStart = time}
			if (jumpState == 2 && jumpTime < time - jumpStart) jumpState = 1;
			if (jumpState == 2) v.y += dt*jg;
			else v.y += dt*g;
			var drag = 1;
			if (jumpState >= 1) {drag = d.a}
			else {
				drag = d.g
				if ( (!c.left && v.x < 0) || (v.x > 0 && !c.right) ) drag = slide;
			}
			drag = Math.pow(drag,dt);
			v.x *= drag;
			v.y *= drag;
			p.x += dt*v.x;
			p.y += dt*v.y;
			
			t = time;
			
			/*collisions*/
			var xMin = Math.floor(p.x-s.x/2);
			var xMax = Math.floor(p.x+s.x/2);
			var yMin = Math.floor(p.y-s.y/2);
			var yMax = Math.floor(p.y+s.y/2);
			var collidesWith = [];
			for (var x = xMin; x <= xMax; x++) {
				for (var y = yMin; y <= yMax; y++) {
					if (world.isWall(x,y)) {
						collidesWith.push({x:x,y:y,dx:Math.abs(p.x-(x+.5)),dy:Math.abs(p.y-(y+.5))});
					}
				}
			}
			
			collidesWith.sort(function(a,b) {return a.dx+a.dy-b.dx-b.dy;});
			var i;
			var hitGround = false;
			for (i in collidesWith) {
				var x = collidesWith[i].x;
				var y = collidesWith[i].y;
				var dx = Math.abs(p.x-(x+.5));
				var dy = Math.abs(p.y-(y+.5));
				if (dx > .5+s.x/2 || dy > .5+s.y/2) continue;
				//context.fillStyle = "blue";
				//if (i == 0) context.fillStyle = "red";
				//context.fillRect(x,y,1,1)
				//context.fillStyle = "black";
				if (dy>dx) {
					/* fix y */
					if (y +.5 > p.y) {
						p.y = y-s.y/2;
						if (v.y > 0) v.y = 0;
					} else {
						if (jumpState != 0) play(440,.1);
						p.y = y+1+s.y/2; jumpState = 0; hitGround = true;
						if (v.y < 0) v.y = 0;
					}
				} else {
					/* fix x */
					if (x +.5 > p.x) {
						p.x = x-s.x/2;
						if (v.x > 0) v.x = 0;
					} else {
						p.x = x+1+s.x/2;
						if (v.x < 0) v.x = 0;
					}
				}
			}
			if (!hitGround && jumpState == 0) jumpState = 1;
		} else { //dead
			v.y-= .01;
			p.y+=v.y;
		}
	}
	this.draw = function() {
		if (!dead) {
			if (Date.now()%500 >250) context.drawImage(images["char1_idle1_" + ((v.x > 0)?"r":"l")],p.x-s.x/2,p.y-s.y/2,s.x,s.y);
			else context.drawImage(images["char1_idle2_" + ((v.x > 0)?"r":"l")],p.x-s.x/2,p.y-s.y/2,s.x,s.y);
		} else {//dead
			context.drawImage(images["char1_death"],p.x-s.x/2,p.y-s.y/2,s.x,s.y);
		}
	}
	this.jump = function(val) {jumpThisFrame = val && !c.jump; c.jump = val; if (!val && jumpState == 2) jumpState = 1;};
	this.left = function(val) {c.left = val};
	this.right = function(val) {c.right = val};
	this.action = function(val) {c.action = val};
	this.kill = function() {
		if (!dead) {
			dead = true;
			v.y = .4;
			var osc = audio.createOscillator()
			osc.connect(audio.destination);
			osc.frequency.setValueAtTime(880,audio.currentTime);
			osc.frequency.linearRampToValueAtTime(440,audio.currentTime+1.5);
			osc.start(audio.currentTime);
			osc.stop(audio.currentTime+1.5);
		}
	}
	this.isDead = function() {return dead}
}
function attachInput(left,right,jump,action,player) {
	window.addEventListener("keydown", function(e) {
		if (e.keyCode==left) {
			player.left(true);
		} else if (e.keyCode==right) {
			player.right(true);
		} else if (e.keyCode==jump) {
			player.jump(true);
		} else if (e.keyCode==action) {
			player.action(true);
		}
	});
	window.addEventListener("keyup", function(e) {
		if (e.keyCode==left) {
			player.left(false);
		} else if (e.keyCode==right) {
			player.right(false);
		} else if (e.keyCode==jump) {
			player.jump(false);
		} else if (e.keyCode==action) {
			player.action(false);
		}
	});
}