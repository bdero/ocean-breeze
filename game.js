window.onload = function() {
    // Canvas setup
    let element = document.getElementById('game')
    let context = element.getContext('2d', {alpha: false})
    let mX, mY, scaleFactor
    let initialTime = Date.now()
    let timeElapsed = 0
    let timeDelta = 0

    let resizeCallback = () => {
        element.width = window.innerWidth
        element.height = window.innerHeight
        mX = element.width/2
        mY = element.height/2
        scaleFactor = (element.width + element.height)/3000
        console.log(`resized to ${element.width} x ${element.height}`)
    }
    window.addEventListener('resize', resizeCallback)
    resizeCallback()

    let disableControls = true
    let launchButton = document.getElementById('launch-button')
    launchButton.onclick = () => {
        console.log('Launch game')
        let launchModal = document.getElementById('launch-modal')
        launchModal.style.display = 'none'
        disableControls = false
    }

    let actions = {
        moveUp: {
            active: false,
            keyCodes: ['ArrowUp', 'KeyW', 'KeyK', 'Numpad8']
        },
        moveDown: {
            active: false,
            keyCodes: ['ArrowDown', 'KeyS', 'KeyJ', 'Numpad5', 'Numpad2']
        },
        moveLeft: {
            active: false,
            keyCodes: ['ArrowLeft', 'KeyA', 'KeyH', 'Numpad4']
        },
        moveRight: {
            active: false,
            keyCodes: ['ArrowRight', 'KeyD', 'KeyL', 'Numpad6']
        }
    }
    let keyCallback = (activate) => {
        return (e) => {
            if (!disableControls) {
                for (let action of Object.keys(actions)) {
                    for (let keyCode of actions[action].keyCodes) {
                        if (keyCode === e.code) {
                            actions[action].active = activate
                        }
                    }
                }
            }
        }
    }
    document.addEventListener('keydown', keyCallback(true))
    document.addEventListener('keyup', keyCallback(false))

    function asymptote(dist, divisor, dt) {
        return (1 - 1/(dt/divisor + 1))*dist;
    }

    let simplex = new SimplexNoise()

    // Camera setup
    let camera = {
        x: 0,
        destinationX: 0,
        destinationXHistory: [0, 0, 0, 0, 0],
        historyCursor: 0,
        zoom: 1.2
    }

    // Water setup
    let mountains = []
    let totalMountains = 2000
    for (let i = 0; i < totalMountains; i++) {
        mountains.push({
            closeness: i,
            x: -0.5 + Math.random(),
            y: -0.5 + 0.3 + (Math.random()/5) + 0.7*i/totalMountains,
            initialRotation: Math.random()*Math.PI*2,
            rotationSpeed: (Math.random()*1 + 1)*Math.sign(Math.random() - 0.5),
            sway: Math.random()*30 + 10
        })
    }

    // Boat setup
    let BoatClass = {
        accelRate: 0.3, frictionRate: 0.2, maxSpeed: 0.7,
        x: 0, y: 0, rotation: 0, closeness: 0,
        vX: 0, vY: 0,
        create: function(x, closeness) {
            return Object.create(BoatClass, {
                x: {value: x, writable: true},
                closeness: {value: closeness, writable: true}
            })
        },
        update: function() {
            // Movement calculations
            if (actions.moveLeft.active)
                this.vX = Math.max(-this.maxSpeed, this.vX - this.accelRate*timeDelta)
            if (actions.moveRight.active)
                this.vX = Math.min(this.maxSpeed, this.vX + this.accelRate*timeDelta)
            if (actions.moveUp.active)
                this.vY = Math.max(-this.maxSpeed, this.vY - this.accelRate*timeDelta)
            if (actions.moveDown.active)
                this.vY = Math.min(this.maxSpeed, this.vY + this.accelRate*timeDelta)

            if (actions.moveLeft.active && !actions.moveRight.active) {
                if (this.vX > 0)
                    this.vX = Math.max(0, this.vX - this.frictionRate*timeDelta)
            } else if (actions.moveRight.active && !actions.moveLeft.active) {
                if (this.vX < 0)
                    this.vX = Math.min(0, this.vX + this.frictionRate*timeDelta)
            } else {
                this.vX = Math.max(0, Math.abs(this.vX) - this.frictionRate*timeDelta) * Math.sign(this.vX)
            }
            if (actions.moveUp.active && !actions.moveDown.active) {
                if (this.vY > 0)
                    this.vY = Math.max(0, this.vY - this.frictionRate*timeDelta)
            } else if (actions.moveDown.active && !actions.moveUp.active) {
                if (this.vY < 0)
                    this.vY = Math.min(0, this.vY + this.frictionRate*timeDelta)
            } else {
                this.vY = Math.max(0, Math.abs(this.vY) - this.frictionRate*timeDelta) * Math.sign(this.vY)
            }

            this.x += this.vX*timeDelta
            this.closeness = Math.max(0.02, Math.min(0.98, this.closeness + this.vY*timeDelta))
            this.y = -0.5 + 0.3 + 0.7*this.closeness

            if (this.closeness === 0.02 || this.closeness === 0.98)
                this.vY = 0
        },
        render: function() {
            context.save()
            let noiseX = simplex.noise(400, timeElapsed/4)*22
            let noiseY = simplex.noise(500, timeElapsed*0.75)*16 + simplex.noise(700, timeElapsed*3)*Math.abs(this.vX)*20
            let noiseRotation = simplex.noise(600, timeElapsed*0.40)/8 + simplex.noise(800, timeElapsed*2)*Math.abs(this.vX)/10

            // Initial transform
            context.scale(scaleFactor, scaleFactor)
            context.translate(
                element.width*this.x/scaleFactor + noiseX,
                element.height*(this.y)/scaleFactor + noiseY
            )
            context.rotate(this.rotation + this.vX/3 + noiseRotation)
            context.translate(-15, 20)

            // Sails
            context.fillStyle = 'orange'
            context.beginPath()
            context.moveTo(37, -280)
            context.lineTo(130, 0)
            context.lineTo(60, 0)
            context.closePath()
            context.fill()
            context.beginPath()
            context.moveTo(37, -300)
            context.lineTo(17, -30)
            context.lineTo(-150, -30)
            context.closePath()
            context.fill()
            // Sail poles
            context.fillStyle = 'white'
            context.fillRect(30, -300, 14, 300)
            context.fillRect(-150, -33, 190, 8)
            // Base hull
            context.save()
            context.fillStyle = 'maroon'
            context.scale(1.3, 1)
            context.beginPath()
            context.arc(0, 0, 100, 0, Math.PI)
            context.closePath()
            context.fill()
            context.restore()
            // Base cap
            context.fillStyle = 'brown'
            context.fillRect(-140, -10, 280, 20)

            context.restore()
        }
    }
    let boat = BoatClass.create(0, 0.5)

    // Game loop
    let loop = () => {
        context.fillStyle = "cyan"
        context.fillRect(0, 0, element.width, element.height)

        let prevTimeElapsed = timeElapsed
        timeElapsed = (Date.now() - initialTime)/1000
        timeDelta = timeElapsed - prevTimeElapsed

        context.save()
        context.scale(camera.zoom, camera.zoom)

        // Camera calculations
        camera.historyCursor = (camera.historyCursor + 1)%camera.destinationXHistory.length
        camera.destinationXHistory[camera.historyCursor] = boat.x + boat.vX*1.3
        camera.destinationX = camera.destinationXHistory.reduce((x, y) => x + y)/camera.destinationXHistory.length
        camera.x += asymptote(camera.destinationX - camera.x, 0.8, timeDelta)
        camera.y = boat.y

        boat.update()
        context.translate(
            mX/camera.zoom - camera.x*element.width + simplex.noise(100, timeElapsed/5)*12*scaleFactor,
            mY/camera.zoom - camera.y/5*element.height + simplex.noise(200, timeElapsed/5)*12*scaleFactor
        )

        // Render scene
        let boatDrawn = false
        for (let mountain of mountains) {
            mountain.rotation += mountain.rotationSpeed
            let distance = (10000/totalMountains + 200)*scaleFactor
            let rotation = mountain.initialRotation + mountain.rotationSpeed*timeElapsed
            let parallax = camera.x*mountain.closeness*0.0008
            let x = (
                element.width*(mountain.x - parallax - Math.floor(mountain.x - parallax - camera.x + 0.5))
                + Math.sin(rotation)*mountain.sway*scaleFactor
            )
            let y = element.height*mountain.y + Math.cos(rotation)*mountain.sway*scaleFactor

            let boatCloseness = boat.closeness*totalMountains
            if (!boatDrawn && mountain.closeness > boatCloseness) {
                boat.render()
                boatDrawn = true
            }

            let red = Math.round(255 - 255.0/(mountain.closeness/(totalMountains/4) + 1))
            let green = Math.round(255 - 105/(mountain.closeness/(totalMountains/4) + 1))
            let alpha = Math.min(
                1,
                Math.abs(boatCloseness - mountain.closeness)/100 + Math.abs(boat.x - x/element.width)*3
            )

            context.fillStyle = `rgba(${red}, ${green}, 0, ${alpha})`
            context.beginPath()
            context.moveTo(x - distance*2, y + distance*0.75)
            context.lineTo(x, y)
            context.lineTo(x + distance*2, y + distance*0.75)
            context.closePath()

            context.fill()
        }

        context.restore()
        requestAnimationFrame(loop)
    }
    loop()
}
