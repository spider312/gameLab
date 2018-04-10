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
	const ships = [new Ship(viewportSize)] ;
	// Bad guys
	const badGuys = new BadGuys(viewportSize) ;
	// Events
		// Keyboard
	const keyStatus = new Array(256).fill(false) ;
	const keyChange = (ev) => keyStatus[ev.keyCode] = ( ev.type === 'keydown' ) ;
	window.addEventListener('keydown', keyChange, false) ;
	window.addEventListener('keyup', keyChange, false) ;
		// Gamepad
	window.addEventListener("gamepadconnected", (ev) => {
		if ( ev.gamepad.buttons.length < 15 ) {
			console.log('Connected gamepad has not enough buttons') ;
			return;
		}
		if ( ships[0].gamepad === null ) { // First detected gamepad is for first ship
			ships[0].gamepad = ev.gamepad ;
			console.log('First gamepad is for first ship') ;
		} else { // Other gamepads create their own ship
			let ship = new Ship(viewportSize, ships.length) ;
			ship.gamepad = ev.gamepad ;
			ships.push(ship) ;
		}
	}) ;
	window.addEventListener("gamepaddisconnected", (ev) => {
		let managed = false ;
		ships.forEach((ship, idx) => {
			if ( ship.gamepad === ev.gamepad ) {
				managed = true ;
				if ( idx === 0 ) {
					ship.gamepad = null ;
					console.log('First ship has no gamepad anymore') ;
				} else {
					console.log('Destroying ship '+idx+' because it has no gamepad anymore') ;
					ships.splice(idx, 1) ;
					ships.forEach((ship, idx) => ship.setY(idx)) ;
				}
			}
		}) ;
		if ( ! managed ) {
			console.log("Disconnected gamepad wasn't linked to any ship") ;
		}
	});
	// Main loop
	const prevState = new Array(256).fill(0) ;
	const loop = () => {
		ships.forEach((ship, idx) => {
			// Keyboard controls first ship
			if ( idx === 0 ) {
				ship.direction = keyStatus[37] * -1 + keyStatus[39] * 1 ;
				ship.firing = keyStatus[32] ;
			}
			// Ship is controlled by a gamepad
			if ( ship.gamepad !== null ) {
				if ( ship.gamepad.buttons[7].pressed || ship.gamepad.buttons[5].pressed ) {
					ship.direction = ship.gamepad.buttons[7].pressed * -1 + ship.gamepad.buttons[5].pressed * 1 ;
				} else if ( ship.gamepad.axes[0] !== 0 ) {
					ship.direction = ship.gamepad.axes[0] ;
				}
				ship.firing = ship.firing || ship.gamepad.buttons[14].pressed ;
			}
			// Update ship
			ship.update() ;
		}) ;
		badGuys.update() ;
		ships.forEach((ship) => ship.collision(badGuys)) ;
	} ;
	setInterval(loop, tickDuration) ;
	// Draw loop
	const draw = () => {
		ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight) ;
		ships.forEach((ship) => ship.draw(ctx)) ;
		badGuys.draw(ctx) ;
		requestAnimationFrame(draw) ;
	} ;
	draw() ;
}

// Ship
function Ship(viewportSize, idx) {
	idx = ( typeof idx === 'number' ) ? idx : 0 ;
	console.log('Here comes a new challenger !', idx) ;
	this.viewportSize = viewportSize;
	this.w = 50 ;
	this.h = 10 ;
	this.x = viewportSize / 2 ;
	this.setY(idx) ;
	this.speed = 10 ;
	this.direction = 0 ;
	this.firing = false ;
	this.fireDelay = this.fireCounter = 10 ;
	this.fireMode = 0 ;
	this.bullets = [] ;
	this.gamepad = null ;
}
Ship.prototype.setY = function setYship(y) { // Reorder ships when a controller is disconnected
	this.y = this.viewportSize - 20 - y * this.h * 2;
} ;
Ship.prototype.update = function updateShip() {
	// Movement
	this.x = this.x + this.direction * this.speed ; // Move
	this.x = Math.min(Math.max(this.x, this.w/2+1), this.viewportSize-1-this.w/2) ; // Cap
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
} ;
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
} ;
Ship.prototype.collision = function collisionShip(badGuys) {
	this.bullets.forEach(function(bullet) {
		badGuys.collision(bullet) ;
	});
} ;
Ship.prototype.draw = function drawShip(ctx) {
	ctx.fillRect(this.x-this.w/2, this.y-this.h/2, this.w, this.h) ;
	this.bullets.forEach(function(bullet) {
		bullet.draw(ctx) ;
	});
} ;
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
} ;
Bullet.prototype.draw = function drawBullet(ctx) {
	ctx.fillRect(this.x, this.y, 1, 1) ;
	ctx.beginPath() ;
	ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2) ;
	ctx.stroke();
} ;
// Bad guys container
function BadGuys(viewportSize) {
	this.viewportSize = viewportSize ;
	// Content
	this.content = [] ;
	this.populate(10) ;
	// Init
	this.choices = [
		() => { this.speedX =  1 ; this.speedY =  0 ;},
		() => { this.speedX =  0 ; this.speedY =  1 ;},
		() => { this.speedX = -1 ; this.speedY =  0 ;},
		() => { this.speedX =  0 ; this.speedY = -1 ;}
	] ;
	this.change() ;
}
BadGuys.prototype.change = function changeBadGuys() {
	this.nextChange = Math.floor(Math.random()*500)+500 ;
	let i = Math.floor(Math.random()*3) ;
	let nextChoice = this.choices.splice(i, 1)[0] ;
	nextChoice() ;
	this.choices.push(nextChoice) ;
} ;
BadGuys.prototype.update = function updateBadGuys() {
	this.content.forEach((badGuy) => { badGuy.update(this.speedX, this.speedY) ; }) ;
	// Trigger change if a badGuy goes near a border
	const leftBG = this.content[0] ;
	const rightBG = this.content[this.content.length - 1] ;
	const margin = 20 ;
	if ( this.speedX !== 0 ) {
		if ( ( leftBG.left + this.speedX <= margin ) || ( rightBG.right + this.speedX >= this.viewportSize - margin ) ) {
			this.speedX = - this.speedX ;
		}
	}
	if ( this.speedY !== 0 ) {
		if ( ( leftBG.top + this.speedY <= margin ) || ( rightBG.bottom + this.speedY >= this.viewportSize - margin - 100 ) ) {
			this.speedY = - this.speedY ;
		}
	}
	// Trigger change after delay
	this.nextChange-- ;
	if ( this.nextChange <= 0 ) {
		this.change() ;
	}
} ;
BadGuys.prototype.populate = function populateBadGuys(nb) {
	for ( let i = 0 ; i < nb ; i++ ) {
		this.content.push(new BadGuy(20*(i+1)*2,30)) ;
	}
} ;
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
} ;
BadGuys.prototype.draw = function drawBadGuys(ctx) {
	this.content.forEach((badGuy) => badGuy.draw(ctx)) ;
} ;
// Bad guys
function BadGuy(x, y, w, h) {
	this.x = x ;
	this.y = y ;
	this.w = w || 20 ;
	this.h = h || 20 ;
	this.updateCoords() ;
}
BadGuy.prototype.tl = function() { return { "x": this.left,  "y": this.top } ; } ;
BadGuy.prototype.tr = function() { return { "x": this.right, "y": this.top } ; } ;
BadGuy.prototype.bl = function() { return { "x": this.left,  "y": this.bottom } ; } ;
BadGuy.prototype.br = function() { return { "x": this.right, "y": this.bottom } ; } ;
BadGuy.prototype.updateCoords = function updateCoordsBadGuy(speedX, speedY) {
	this.left = this.x-this.w/2 ;
	this.right = this.x+this.w/2 ;
	this.top = this.y-this.h/2 ;
	this.bottom = this.y+this.h/2 ;
} ;
BadGuy.prototype.update = function updateBadGuy(speedX, speedY) {
	this.x += speedX ;
	this.y += speedY ;
	this.updateCoords() ;
} ;
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
} ;
BadGuy.prototype.draw = function drawBadGuy(ctx) {
	ctx.fillRect(this.x-this.w/2, this.y-this.h/2, this.w, this.h) ;
} ;
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
