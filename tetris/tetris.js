function start(ev) {
	const difficultyInput = document.getElementById('difficultyInput') ;
	const speedInput = document.getElementById('speedInput') ;
	const scoreInput = document.getElementById('scoreInput') ;
	const canvas = document.getElementById('tetris') ;
	canvas.focus() ;
	const ctx = canvas.getContext('2d') ;
	// Game config
	const gridW = 10, gridH = 20 ;
	const kbdInterval = 100 ; // Interval between keyboard state interpreted
	const initialLoopInterval = 1000 ; // Initial delay between auto-down
	// Adapt viewport size
	const boxSize = Math.min(
		Math.floor(document.documentElement.clientWidth / gridW),
		Math.floor(document.documentElement.clientHeight / gridH)
	) ;
	canvas.width = gridW * boxSize ;
	canvas.height = gridH * boxSize ;
	// Shapes definition
	const shapes = [] ;
	const X = true, O = false ; // Readability
	shapes.push([ // Bar
		[X,X,X,X]
	]) ;
	shapes.push([ // Square
		[X,X],
		[X,X]
	]) ;
	shapes.push([ // L
		[O,O,X],
		[X,X,X]
	]) ;
	shapes.push([ // Reversed L
		[X,O,O],
		[X,X,X]
	]) ;
	shapes.push([ // S
		[X,X,O],
		[O,X,X]
	]) ;
	shapes.push([ // Reversed S
		[O,X,X],
		[X,X,O]
	]) ;
	shapes.push([ // The undescriptible
		[O,X,O],
		[X,X,X]
	]) ;
	// Interface update
	const setSpeed = (newSpeed) => speedInput.value = speed = Math.floor(newSpeed) ;
	const setScore = (newScore) => scoreInput.value = score = newScore ;
	const getDifficulty = () => {
		difficulty = difficultyInput.valueAsNumber / 100 ;
		difficultyInput.blur() ;
	} ;
	// New game
	let speed, grid, currentShape, score, difficulty ;
	const newGame = () => {
		grid = matrix(gridW, gridH, 0) ;
		setSpeed(0);
		setScore(0) ;
		currentShape = new Shape(shapes, gridW, gridH) ;
	} ;
	getDifficulty() ;
	newGame() ;
	// Interface events
	difficultyInput.addEventListener('change', getDifficulty, false) ;
	// Keyboard management
	let leftPressed = rightPressed = downPressed = null ;
	let offsetX = offsetY = 0 ;
	const press = (pressed, key, offsetX, offsetY) => {
		if ( pressed ) { // Start or confirm movment
			if ( key === null ) { // Movment not already started : start
				currentShape.move(offsetX, offsetY, grid) ;
				return setInterval(() => {
					currentShape.move(offsetX, offsetY, grid) ;
				}, kbdInterval) ;
			} else { // Just confirm
				return key ;
			}
		} else { // Stop movment
			clearInterval(key) ;
			return null ;
		}
	}
	const keyChange = (ev) => {
		const pressed = ( ev.type === 'keydown' ) ;
		switch ( ev.keyCode ) {
			case 37 : // Left
				leftPressed = press(pressed, leftPressed, -1, 0) ;
				break ;
			case 38 : // Up
				if ( pressed ) currentShape.rotate(grid) ;
				break ;
			case 39 : // Right
				rightPressed = press(pressed, rightPressed, 1, 0) ;
				break ;
			case 40 : // Down
				downPressed = press(pressed, downPressed, 0, 1) ;
				break ;
			default :
				//console.log(ev.keyCode) ;
		}
	} ;
	window.addEventListener('keydown', keyChange, false) ;
	window.addEventListener('keyup', keyChange, false) ;
	// Keyboard loop
	/*
	setInterval(() => {
		if ( ( offsetX !== 0 ) || ( offsetY !== 0 ) ) {
			currentShape.move(offsetX, offsetY, grid) ;
		}
	}, kbdInterval) ;
	*/
	// Down loop
	const loop = function downLoop() {
		if ( ! currentShape.move(0, 1, grid) ) {
			// Can't go down, new block
			currentShape.imprint(grid) ;
			currentShape = new Shape(shapes, gridW, gridH) ;
			//setScore(score + speed) ;
			setSpeed(Math.min(
				speed + ( initialLoopInterval - speed ) * difficulty, // Add to speed a percentage of speed potential (to get a logarithmic acceleration)
				initialLoopInterval - 10 // Speed can't create a loop with delay less than 10ms
			)) ;
			// Remove full lines
			let linesToRemove = new Array(gridH).fill(true) ;
			grid.forEach((column, colIdx) => {
				column.forEach((box, rowIdx) => {
					if ( box === 0 ) {
						linesToRemove[rowIdx] = false ;
					}
				}) ;
			}) ;
			grid.forEach((column, colIdx) => {
				linesToRemove.forEach((remove, idx) => {
					if ( remove ) {
						column.splice(idx, 1 ) ;
						column.unshift(0) ;
					}
				}) ;
			}) ;
			// New block shouldn't move, game lost
			if ( ! currentShape.canMove(currentShape.x, currentShape.y, grid) ) {
				if ( confirm("You've lost, start a new game ?") ) {
					leftPressed = rightPressed = downPressed = upPressed = false ; // Confirm may interfere with kbd state detection
					newGame() ;
				}
			}
		}
		setTimeout(loop, initialLoopInterval - speed) ; // SetTimeout instead of setInterval because speed will change
	}
	setTimeout(loop, initialLoopInterval) ; // So the player can see the grid before the first auto-move
	// Render
	let draw = () => {
		// Clear
		ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight) ;
		// Draw grid
		grid.forEach((column, colIdx) => {
			column.forEach((box, rowIdx) => {
				ctx.fillStyle = currentShape.color(grid[colIdx][rowIdx]) ;
				ctx.fillRect(colIdx * boxSize, rowIdx * boxSize, boxSize, boxSize) ;
			}) ;
		}) ;
		// Draw shape
		currentShape.draw(ctx, boxSize) ;
		// Loop
		requestAnimationFrame(draw) ;
	}
	draw() ;
}

function Shape(shapes, gridW, gridH) {
	this.gridW = gridW ;
	this.gridH = gridH ;
	this.index = Math.floor(Math.random()*shapes.length) ;
	this.shape = shapes[this.index] ;
	this.w = this.shape.length ;
	this.h = this.shape[0].length ;
	this.x = Math.floor((this.gridW - this.w ) / 2) ;
	this.y = 0 ;
}
Shape.prototype.move = function(x, y, grid) {
	// Bottom boundary (no other tests are done on "y" as it may only go "down" (increasing)
	if ( this.y + y + this.h - 1 >= this.gridH ) {
		return false ;
	}
	let newY = this.y + y ;
	let newX = this.x + x ;
	if ( ( newX < 0 ) || ( newX + this.w - 1 >= this.gridW ) ) {
		newX = this.x ;
	}
	let result = this.canMove(newX, newY, grid) ; // Check collision with grid
	if ( result ) { // Apply
		this.x = newX ;
		this.y = newY ;
	}
	return result ;
}
Shape.prototype.canMove = function(x, y, grid) {
	if ( y + this.h > this.gridH ) { // Out of boundaries
		return false ;
	}
	return this.forEach((colIdx, rowIdx, box) => {
		if ( box ) {
			return ( grid[x + colIdx][y + rowIdx] === 0 ) ;
		}
	}) ;
}
Shape.prototype.imprint = function(grid) {
	this.forEach((colIdx, rowIdx, box) => {
		if ( box ) {
			grid[this.x + colIdx][this.y + rowIdx] = this.index + 1 ;
		}
	}) ;
}
Shape.prototype.rotate = function(grid, counterClockwise) {
	// Rotate shape
	let newMatrix = matrix(this.h, this.w, false) ;
	this.forEach((colIdx, rowIdx, box) => {
		if ( counterClockwise ) {
			newMatrix[rowIdx][this.w-colIdx-1] = box ;
		} else {
			newMatrix[this.h-rowIdx-1][colIdx] = box ;
		}
	}) ;
	// Check rotation
	let newShape = new Shape([newMatrix], this.gridW, this.gridH) ;
	newShape.x = Math.min(this.x, this.gridW - this.h) ; // Stay inside boundaries
	newShape.y = this.y ;
	if ( newShape.canMove(newShape.x, newShape.y, grid) ) {
		this.shape = newShape.shape ;
		this.x = newShape.x ;
		this.w = newShape.w ;
		this.h = newShape.h ;
	}
}
Shape.prototype.colors = ['#FFFFFF', '#000000', '#AA0000', '#00AA00', '#0000AA', '#AAAA00', '#AA00AA', '#00AAAA'] ;
Shape.prototype.color = function(idx) {
	if ( (  idx < 0 ) || ( idx >= this.colors.length ) ) idx = 0 ;
	return this.colors[idx] ;
}
Shape.prototype.forEach = function(callback) { // callback will recieve colIdx, rowIdx, box value
	let result = true ;
	this.shape.forEach((column, colIdx) => {
		column.forEach((box, rowIdx) => {
			if ( ! result ) {
				return false ;
			}
			if ( false === callback(colIdx, rowIdx, box) ) {
				result = false ;
			}
		}) ;
	}) ;
	return result ;
}
Shape.prototype.draw = function(ctx, boxSize) {
	this.forEach((colIdx, rowIdx, box) => {
		if ( box ) {
			ctx.fillStyle = this.color(this.index + 1) ;
			ctx.fillRect(
				( this.x + colIdx ) * boxSize,
				( this.y + rowIdx ) * boxSize,
				boxSize, boxSize
			) ;
		}
	}) ;
}
// Lib
function matrix(w, h, filler) {
	let result = [] ;
	for ( let i = 0 ; i < w ; i++ ) {
		let arr = [] ;
		for ( let j = 0 ; j < h ; j++ ) { arr.push(filler) ; }
		result.push(arr) ;
	}
	return result ;
}
