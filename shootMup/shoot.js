function start(ev) {
	const tickDuration = 10 ;
	// Viewport
	const viewportSize = 500 ;
	const canvas = document.getElementById('shoot') ;
	canvas.tabIndex = 0;
	canvas.focus();
	canvas.width = viewportSize ;
	canvas.height = viewportSize ;
	const ctx = canvas.getContext('2d') ;
	// Ship
	const ship = new Ship(viewportSize) ;
	// Bad guys
	const badGuys = new BadGuys(viewportSize) ;
	// Events
		// Keyboard
	const keyStatus = new Array(256).fill(false) ;
	const keyChange = (ev) => keyStatus[ev.keyCode] = ( ev.type === 'keydown' ) ;
	window.addEventListener('keydown', keyChange, false) ;
	window.addEventListener('keyup', keyChange, false) ;
		// Gamepad
	let gamepads = [] ;
	window.addEventListener("gamepadconnected", function(ev) {
		gamepads = window.navigator.getGamepads()
		//console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.", ev.gamepad.index, ev.gamepad.id, ev.gamepad.buttons.length, ev.gamepad.axes.length);
	});
	window.addEventListener("gamepaddisconnected", function(ev) {
		gamepads = window.navigator.getGamepads()
		//console.log("Gamepad disconnected from index %d: %s", ev.gamepad.index, ev.gamepad.id);
	});
	// Main loop
	//const prevState = new Array(256).fill(false) ;
	const loop = () => {
		ship.goLeft = keyStatus[37] // <-
		ship.goRight = keyStatus[39] // ->
		ship.firing = keyStatus[32] // [ ]
		gamepads.forEach((gp) => {
			ship.goLeft = ship.goLeft || gp.buttons[7].pressed ;
			ship.goRight = ship.goRight || gp.buttons[5].pressed ;
			ship.firing = ship.firing || gp.buttons[14].pressed ;
		}) ;
		/*
		if ( gamepads.length > 0 ) {
			// Debug button pression
			let gp = gamepads[0] ;
			gp.buttons.forEach((button, idx) => {
				if ( button.pressed !== prevState[idx] ) {
					prevState[idx] = button.pressed ;
					console.log('button : '+idx+' : '+button.pressed) ;
				}
			}) ;
		}
		*/
		ship.update() ;
		badGuys.update() ;
		ship.collision(badGuys) ;
	}
	setInterval(loop, tickDuration) ;
	// Draw loop
	const draw = () => {
		ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight) ;
		ship.draw(ctx) ;
		badGuys.draw(ctx) ;
		requestAnimationFrame(draw) ;
	}
	draw() ;
}

// Ship
function Ship(viewportSize) {
	this.viewportSize = viewportSize;
	this.w = 100 ;
	this.h = 10 ;
	this.x = viewportSize / 2 ;
	this.y = viewportSize - 20 ;
	this.speed = 10 ;
	this.goLeft = this.goRight = this.firing = false ;
	this.fireDelay = this.fireCounter = 10 ;
	this.fireMode = 0 ;
	this.bullets = [] ;
}
Ship.prototype.update = function updateShip() {
	// Movement
	if ( this.goLeft ) {
		this.x -= this.speed ;
		this.x = Math.max(this.x, this.w/2+1) ;
	}
	if ( this.goRight ) {
		this.x += this.speed ;
		this.x = Math.min(this.x, this.viewportSize-1-this.w/2) ;
	}
	// Fire
	if ( this.firing ) {
		if ( this.fireCounter === this.fireDelay ) {
			this.fire() ;
			this.fireCounter = 0 ;
		}
		this.fireCounter++ ;
	}
	// Bullets
	this.bullets.forEach(function(bullet) {
		bullet.update() ;
	});
}
Ship.prototype.fire = function fireShip() {
	switch ( this.fireMode ) {
		case 1 :
			this.bullets.push(new Bullet(this.x, this.y, 5)) ;
			this.bullets.push(new Bullet(this.x, this.y, -5)) ;
			break ;
		case 2 :
			this.bullets.push(new Bullet(this.x, this.y)) ;
			this.bullets.push(new Bullet(this.x, this.y, 5)) ;
			this.bullets.push(new Bullet(this.x, this.y, -5)) ;
			break ;
		default : 
			this.bullets.push(new Bullet(this.x, this.y)) ;
	}
}
Ship.prototype.collision = function collisionShip(badGuys) {
	this.bullets.forEach(function(bullet) {
		badGuys.collision(bullet) ;
	});
}
Ship.prototype.draw = function drawShip(ctx) {
	ctx.fillRect(this.x-this.w/2, this.y-this.h/2, this.w, this.h) ;
	this.bullets.forEach(function(bullet) {
		bullet.draw(ctx) ;
	});
}
// Bullets
function Bullet(x, y, speedX, speedY) {
	this.x = x ;
	this.y = y ;
	this.speedX = speedX || 0 ;
	this.speedY = speedY || 10 ;
	this.radius = 5 ;
}
Bullet.prototype.update = function updateBullet() {
	this.x -= this.speedX ;
	this.y -= this.speedY ;
}
Bullet.prototype.draw = function drawBullet(ctx) {
	ctx.fillRect(this.x, this.y, 1, 1) ;
	ctx.beginPath() ;
	ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2) ;
	ctx.stroke();
}
// Bad guys container
function BadGuys(viewportSize) {
	this.viewportSize = viewportSize ;
	// Content
	this.content = [] ;
	this.populate(10) ;
	// Init
	this.change() ; 
}
BadGuys.prototype.change = function changeBadGuys() {
	this.speedX = Math.floor(Math.random()*3)-1 ;
	this.speedY = Math.floor(Math.random()*3)-1 ;
	this.nextChange = Math.floor(Math.random()*1000)+1 ;
}
BadGuys.prototype.update = function updateBadGuys() {
	this.content.forEach((badGuy) => { badGuy.update(this.speedX, this.speedY) }) ;
	// Trigger change if a badGuy goes near a border
	const leftBG = this.content[0] ;
	const rightBG = this.content[this.content.length - 1] ;
	const margin = 5 ;
	if (
		( leftBG.left < margin )
		||
		( leftBG.top < margin )
		||
		( rightBG.right > this.viewportSize - margin )
		||
		( rightBG.bottom > this.viewportSize - margin - 100 )
	) {
		return this.change() ;
	}
	// Trigger change after delay
	this.nextChange-- ;
	if ( this.nextChange <= 0 ) {
		this.change() ;
	}
}
BadGuys.prototype.populate = function populateBadGuys(nb) {
	for ( let i = 0 ; i < nb ; i++ ) {
		this.content.push(new BadGuy(20*(i+1)*2,20)) ;
	}
}
BadGuys.prototype.collision = function collisionBadGuys(bullet) {
	this.content.forEach((badGuy, idx) => {
		if ( badGuy.collision(bullet) ) {
			this.content.splice(idx, 1) ;
			console.log(this.content.length+' bad guys left') ;
			if ( this.content.length === 0 ) {
				this.populate(10) ;
			}
		}
	}) ;
}
BadGuys.prototype.draw = function drawBadGuys(ctx) {
	this.content.forEach((badGuy) => { badGuy.draw(ctx) }) ;
}
// Bad guys
function BadGuy(x, y, w, h) {
	this.x = x ;
	this.y = y ;
	this.w = w || 20 ;
	this.h = h || 20 ;
	this.updateCoords() ;
}
BadGuy.prototype.tl = function() { return { "x": this.left,  "y": this.top } } ;
BadGuy.prototype.tr = function() { return { "x": this.right, "y": this.top } } ;
BadGuy.prototype.bl = function() { return { "x": this.left,  "y": this.bottom } } ;
BadGuy.prototype.br = function() { return { "x": this.right, "y": this.bottom } } ;
BadGuy.prototype.updateCoords = function updateCoordsBadGuy(speedX, speedY) {
	this.left = this.x-this.w/2 ;
	this.right = this.x+this.w/2 ;
	this.top = this.y-this.h/2 ;
	this.bottom = this.y+this.h/2 ;
}
BadGuy.prototype.update = function updateBadGuy(speedX, speedY) {
	this.x += speedX ;
	this.y += speedY ;
	this.updateCoords() ;
}
BadGuy.prototype.collision = function collisionBadGuy(bullet) {
	let tl = this.tl(),
	    tr = this.tr(),
	    bl = this.bl(),
	    br = this.br();
	if (
		( // Bullet inside badguy
			( bullet.x > this.left ) &&
			( bullet.x < this.right ) &&
			( bullet.y > this.top ) &&
			( bullet.y < this.bottom )
		) || // Bullet collisionning a badguy's side
		( distancePointLine(bullet, tl, tr) < bullet.radius ) ||
		( distancePointLine(bullet, tr, br) < bullet.radius ) ||
		( distancePointLine(bullet, br, bl) < bullet.radius ) ||
		( distancePointLine(bullet, bl, tl) < bullet.radius )
	) {
		return true ;
	}
	return false ;
}
BadGuy.prototype.draw = function drawBadGuy(ctx) {
	ctx.fillRect(this.x-this.w/2, this.y-this.h/2, this.w, this.h) ;
}
// Lib
function magnitudeSquare(a, b) { // Returns the square of a distance in order to avoid sqrt in comparisons
	let dx = a.x - b.x ;
	let dy = a.y - b.y ;
	return dx * dx + dy * dy ;
}
function distancePointLine(c, a, b) { // c is the circle center, [a,b] is the line segment
	let result;
	let magnitude = magnitudeSquare(b, a) ;
	let u = ( (c.x - a.x)*(b.x - a.x) + (c.y - a.y)*(b.y - a.y) ) / magnitude ;
	if ( (u < 0) || (u > 1) ) { // Closest point does not fall within the line segment, take the shorter distance to an endpoint
		result = Math.min(magnitudeSquare(c, a), magnitudeSquare(c, b));
		//result = 0 ;
	} else { // Intersecting point is on the line, use the formula
		let intersection = { "x": a.x + u * (b.x - a.x), "y": a.y + u * (b.y - a.y) } ;
		result = magnitudeSquare(c, intersection) ;
	}
	return Math.sqrt(result) ; // finally convert to actual distance not its square
}
