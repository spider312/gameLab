function start(startEv) {
	const canvas = document.getElementById('bounceCanvas') ;
	const counter = document.getElementById('counter') ;
	const fps = document.getElementById('fps') ;
	let gunX = canvas.clientWidth / 2 ;
	let gunY = canvas.clientHeight ;
	const ctx = canvas.getContext('2d') ;
	let mouseX = 0, mouseY = 0 ;
	let bullets = [] ;
	let time = null ;
	let timer = null ;
	let canon = {"x": gunX, "y": gunY} ;
	const fireDelay = 100 ;
	const framerate = 40 ;
	let isFiring = false ;
	let isRunning = false ; // Just for canon animation
	let firedBullets = 0 ;
	let frames = 0 ;
	const gunRadius = 100 ;
	let obstacles = null ;
	const init = () => {
		window.nbBullets = 1 ;
		obstacles = new Obstacles(canvas, gunRadius) ;
	}
	init() ;

	const updateCounter = () => {
		counter.value = bullets.length + '/' + window.nbBullets ;
		if ( bullets.length === 0 ) {
			isRunning = false ;
		}
	}

	// Events
		// Mouse updating
	canvas.addEventListener('mousemove', function mouseMoveHandler(ev) {
		if ( isFiring ) return;
		mouseX = ev.clientX - canvas.offsetLeft ;
		mouseY = ev.clientY - canvas.offsetTop ;
	}, false) ;
		// Fire
	const fire = () => {
		new Bullet(bullets, canvas, gunX, gunY, canon.x, canon.y) ;
		updateCounter() ;
		firedBullets++;
		if ( firedBullets < nbBullets ) {
			window.setTimeout(fire, fireDelay) ;
		} else {
			isFiring = false ;
		}
	}
	canvas.addEventListener('click', function() {
		if ( isRunning ) return ;
		isRunning = true ;
		isFiring = true ;
		firedBullets = 0 ;
		fire() ;
	}, false) ;

	// Main loop
	let draw = () => {
		let begin = new Date() ;
		// Clear
		ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight) ;
		// Gun
		canon = drawGun(ctx, gunRadius, gunX, gunY, mouseX, mouseY) ;
		// Bullets
		bullets.forEach(function bulletsLoop(bullet, idx) {
			bullet.update(obstacles) ;
			bullet.draw(ctx) ;
		}) ;
		let before = bullets.length ;
		bullets = bullets.filter(a => a.isDisplayed) ; // Filter gone out bullets
		updateCounter() ;
		if ( ( before > 0 ) && ( bullets.length === 0 ) ) {
			obstacles.endTurn() ;
			if ( obstacles.lost ) {
				alert('lost') ;
				init() ;
			} else {
				obstacles.addLine(0) ;
			}
		}
		// Obstacles
		obstacles.draw(ctx) ;
		frames++ ;
		requestAnimationFrame(draw);
	}
	draw();
	window.setInterval(function mainLoop() {
		fps.value = frames ;
		frames = 0 ;
	}, 1000);
}

function drawGun(ctx, radius, gunX, gunY, mouseX, mouseY) {
	// Radius
	ctx.beginPath() ;
	ctx.arc(gunX, gunY, radius, Math.PI, Math.PI*2) ;
	ctx.stroke();
	// Canon
	let lenX = mouseX - gunX ;
	let lenY = mouseY - gunY ;
	let lenH = Math.sqrt(lenX * lenX + lenY * lenY) ; // Hypothenuse
	let thales = radius / lenH ;
	let canonX = gunX + thales * lenX ;
	let canonY = gunY + thales * lenY ;
	ctx.closePath();
	ctx.beginPath() ;
	ctx.moveTo(gunX, gunY) ;
	ctx.lineTo(canonX, canonY) ;
	ctx.stroke();
	ctx.closePath();
	return {"x": canonX, "y": canonY} ; // Update canon position upstream
}

// === Bullets ===

function Bullet(bullets, canvas, gunX, gunY, mouseX, mouseY, speed, radius) {
	this.canvas = canvas ;
	this.isDisplayed = true ;
	this.posX = mouseX ;
	this.posY = mouseY ;
	let offsetX = mouseX - gunX ;
	let offsetY = mouseY - gunY ;
	let speedVectorLength = Math.sqrt( offsetX * offsetX + offsetY * offsetY ) ;
	this.speedX = ( mouseX - gunX ) / speedVectorLength ;
	this.speedY = ( mouseY - gunY ) / speedVectorLength ;
	this.speed = ( typeof speed === 'number' ) ? speed : 5 ;
	this.radius = ( typeof radius === 'number' ) ? radius : 5 ; ;
	bullets.push(this) ;
}
Bullet.prototype.center = function () { return { "x": this.posX, "y": this.posY } } ;
Bullet.prototype.collision = function(obstacle, a, b, axis) {
	let distance = distancePointLine(this.center(), obstacle[a](), obstacle[b]()) ;
	if ( distance < this.radius ) {
		this[axis] = - this[axis] ;
		obstacle.hit() ;
	}
}
Bullet.prototype.update = function updateBullet(obstacles) {
	// Apply speed
	this.posX += this.speed * this.speedX ;
	this.posY += this.speed * this.speedY ;
	// Collision
	obstacles.forEach((obstacle) => {
		if ( this.speedX < 0 ) { this.collision(obstacle, 'tr', 'br', 'speedX') ; } // Going left
		if ( this.speedX > 0 ) { this.collision(obstacle, 'tl', 'bl', 'speedX') ; } // Going right
		if ( this.speedY < 0 ) { this.collision(obstacle, 'bl', 'br', 'speedY') ; } // Going up
		if ( this.speedY > 0 ) { this.collision(obstacle, 'tl', 'tr', 'speedY') ; } // Going down
	}) ;
	// Bounce
	if ( this.posX < this.radius ) {
		this.posX = 2 * this.radius - this.posX ;
		this.speedX = - this.speedX ;
	}
	if ( this.posX + this.radius > this.canvas.clientWidth ) {
		this.posX = this.canvas.clientWidth - ( this.canvas.clientWidth - this.posX ) ;
		this.speedX = - this.speedX ;
	}
	if ( this.posY < this.radius ) {
		this.posY = 2 * this.radius - this.posY ;
		this.speedY = - this.speedY ;
	}
	// Go out
	if ( this.posY - this.radius > this.canvas.clientHeight ) {
		this.isDisplayed = false ;
	}
}

Bullet.prototype.draw = function drawBullet(ctx) {
	if ( this.isDisplayed ) {
		ctx.beginPath();
		ctx.arc(this.posX, this.posY, this.radius, 0, Math.PI * 2);
		ctx.fill();
	}
}

// === Obstacles container ===
function Obstacles(canvas, gunRadius) {
	this.loseHeight = canvas.height - gunRadius ;
	this.lost = false ;
	this.content = [] ;
	this.nbX = 8;
	this.nbY = 5 ;
	this.padding = 20 ;
	this.width = ( canvas.width - ( this.nbX + 1 ) * this.padding ) / this.nbX ;
	this.height = ( canvas.height / 2 - ( this.nbY + 1 ) * this.padding ) / this.nbY ;
	for ( let j = 0 ; j < this.nbY ; j++ ) {
		this.addLine(j) ;
	}
}
Obstacles.prototype.addLine = function(j) {
	for ( let i = 0 ; i < this.nbX ; i++ ) {
		this.content.push(new Obstacle((i+1)*this.padding+i*this.width, (j+1)*this.padding+j*this.height, this.width, this.height)) ;
	}
}
Obstacles.prototype.forEach = function(obstacle, idx, obstacles) { this.content.forEach(obstacle, idx, obstacles) } ;
Obstacles.prototype.draw = function(ctx) {
	this.content.forEach(function bulletsLoop(obstacle) {
		obstacle.draw(ctx) ;
	}) ;
	this.content = this.content.filter(a => a.isDisplayed) ; // Filter hit obstacles
}
Obstacles.prototype.endTurn = function() {
	this.content.forEach((obstacle, idx, obstacles) => {
		obstacle.posY += this.padding + this.height ;
		if ( obstacle.posY + this.height > this.loseHeight ) {
			this.lost = true ;
		}
	}) ;
}
// === Obstacles ===
function Obstacle(posX, posY, widthX, widthY) {
	this.isDisplayed = true ;
	this.posX = posX ;
	this.posY = posY ;
	this.widthX = widthX ;
	this.widthY = widthY ;
	this.effect = 0 ;
	if ( Math.random() < 1 / 3 ) {
		this.effect = 1 ;
	} else if ( Math.random() < 1 / 3 ) {
		this.effect = -1 ;
	}
}
Obstacle.prototype.tl = function() { return { "x": this.posX, "y": this.posY } } ;
Obstacle.prototype.tr = function() { return { "x": this.posX + this.widthX, "y": this.posY } } ;
Obstacle.prototype.bl = function() { return { "x": this.posX, "y": this.posY + this.widthY } } ;
Obstacle.prototype.br = function() { return { "x": this.posX + this.widthX, "y": this.posY + this.widthY } } ;
Obstacle.prototype.draw = function drawObstacle(ctx) {
	ctx.save() ;
	switch ( this.effect ) {
		case -1 :
			ctx.fillStyle = '#FF0000' ;
			break ;
		case 0 :
			ctx.fillStyle = '#000000' ;
			break ;
		case 1 :
			ctx.fillStyle = '#00AA00' ;
			break ;
		default :
			ctx.fillStyle = '#FFFFFF' ;
	}
	ctx.fillRect(this.posX, this.posY, this.widthX, this.widthY) ;
	ctx.restore() ;
} ;
Obstacle.prototype.hit = function() {
	if ( ! this.isDisplayed ) return ;
	this.isDisplayed = false ;
	window.nbBullets = Math.max(1, window.nbBullets + this.effect ) ;
} ;
Obstacle.prototype.debug = function() {
	console.log('Obstacle('+this.posX+', '+this.posY+', '+this.widthX+', '+this.widthY+', '+this.effect+')') ;
}

// === Lib ===
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
