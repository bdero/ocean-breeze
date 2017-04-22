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
        return (1 - 1/(dt/divisor + 1))*dist
    }

    let simplex = new SimplexNoise()

    let arrowPoints = [
        -10, -6,
          3, -6,
          3,-10,
         10,  0,
          3, 10,
          3,  6,
        -10,  6,
         -8,  0
    ]

    // Camera setup
    let camera = {
        x: 0,
        destinationX: 0,
        destinationXHistory: [0, 0, 0, 0, 0],
        historyCursor: 0,
        zoom: 1.2,
        destinationZoom: 1.2
    }

    // Water setup
    let waves = []
    let totalWaves = 2200
    for (let i = 0; i < totalWaves; i++) {
        waves.push({
            closeness: i,
            x: -0.5 + Math.random(),
            y: -0.5 + 0.3 + (Math.random()/5) + 0.7*i/totalWaves,
            initialRotation: Math.random()*Math.PI*2,
            rotationSpeed: (Math.random()*1 + 1)*Math.sign(Math.random() - 0.5),
            sway: Math.random()*20 + 5
        })
    }

    let wind = {
        x: 0
    }

    // Boat setup
    let BoatClass = {
        accelRate: 0.2, frictionRate: 0.1, maxSpeed: 0.35,
        x: 0, y: 0, rotation: 0, closeness: 0,
        vX: 0, vY: 0,
        sailPosition: 0,
        sailPositionDestination: 0,
        create: function(x, closeness) {
            return Object.create(BoatClass, {
                x: {value: x, writable: true},
                closeness: {value: closeness, writable: true}
            })
        },
        update: function() {
            // Movement calculations
            if (actions.moveLeft.active && !actions.moveRight.active)
                this.sailPositionDestination = -1
            else if (actions.moveRight.active && !actions.moveLeft.active)
                this.sailPositionDestination = 1
            else
                this.sailPositionDestination = 0
            this.sailPosition += asymptote(this.sailPositionDestination - this.sailPosition, 1, timeDelta)
            this.vX += (this.sailPosition*wind.x/20 + wind.x/60)*timeDelta
            if (actions.moveUp.active)
                this.vY = Math.max(-this.maxSpeed, this.vY - this.accelRate*timeDelta)
            if (actions.moveDown.active)
                this.vY = Math.min(this.maxSpeed, this.vY + this.accelRate*timeDelta)
            this.vX = Math.min(this.maxSpeed, Math.max(0, Math.abs(this.vX)*(1 - this.frictionRate*timeDelta))) * Math.sign(this.vX)
            this.vY = Math.max(0, Math.abs(this.vY) - this.frictionRate*timeDelta) * Math.sign(this.vY)

            this.x += this.vX*timeDelta
            this.closeness = Math.max(0.02, Math.min(0.98, this.closeness + this.vY*timeDelta))
            this.y = -0.5 + 0.3 + 0.7*this.closeness

            if (this.closeness === 0.02 || this.closeness === 0.98)
                this.vY = 0
        },
        render: function() {
            context.save()
            let noiseX = simplex.noise(400, timeElapsed/4)*22
            let noiseY = simplex.noise(500, timeElapsed*0.75)*16 + simplex.noise(700, timeElapsed*3)*Math.abs(this.vX)*12
            let noiseRotation = simplex.noise(600, timeElapsed*0.40)/8 + simplex.noise(800, timeElapsed*2.5)*Math.abs(this.vX)/7

            // Initial transform
            context.scale(scaleFactor, scaleFactor)
            context.translate(
                element.width*this.x/scaleFactor + noiseX,
                element.height*(this.y)/scaleFactor + noiseY
            )
            context.scale(0.8, 0.8)
            context.rotate(this.rotation + this.vX/1.5 + wind.x/10 + noiseRotation)
            context.translate(-15, 45)

            context.save()

            context.translate(37, 0)
            // Sails
            context.fillStyle = 'orange'
            context.beginPath()
            context.moveTo(0, -280)
            context.lineTo(93, 0)
            context.lineTo(23, 0)
            context.closePath()
            context.fill()

            context.save()
            context.scale(0.9 - this.sailPosition/5, 1)
            context.beginPath()
            context.moveTo(0, -300)
            context.lineTo(-20, -30)
            context.lineTo(-187, -30)
            context.closePath()
            context.fill()
            // Sail poles
            context.fillStyle = 'white'
            context.fillRect(-187, -33, 190, 8)
            context.restore()
            context.fillStyle = 'white'
            context.fillRect(-7, -300, 14, 300)

            context.restore()

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
        context.fillStyle = 'rgb(200, 120, 200)'
        context.fillRect(0, 0, element.width, element.height)

        let prevTimeElapsed = timeElapsed
        timeElapsed = (Date.now() - initialTime)/1000
        timeDelta = timeElapsed - prevTimeElapsed

        wind.x = Math.sin(simplex.noise(900, timeElapsed/5)*Math.PI/2)

        boat.update()

        context.save()

        // Camera calculations
        camera.destinationZoom = 1.4 - Math.abs(boat.vX)*0.8
        camera.zoom += asymptote(camera.destinationZoom - camera.zoom, 30, timeElapsed)
        context.scale(camera.zoom, camera.zoom)

        camera.historyCursor = (camera.historyCursor + 1)%camera.destinationXHistory.length
        camera.destinationXHistory[camera.historyCursor] = boat.x + boat.vX*1.3
        camera.destinationX = camera.destinationXHistory.reduce((x, y) => x + y)/camera.destinationXHistory.length
        camera.x += asymptote(camera.destinationX - camera.x, 0.8, timeDelta)
        camera.y = boat.y

        context.translate(
            mX/camera.zoom - element.width*(camera.x + simplex.noise(100, timeElapsed/5)/100),
            mY/camera.zoom - element.height*(camera.y/5 + simplex.noise(200, timeElapsed/5)/100 + camera.zoom/7 - 0.1)
        )

        // Render scene
        let boatDrawn = false
        for (let wave of waves) {
            wave.rotation += wave.rotationSpeed
            let distance = (10000/totalWaves + 200)*scaleFactor
            let rotation = wave.initialRotation + wave.rotationSpeed*timeElapsed
            let parallax = camera.x*wave.closeness*0.0008
            let x = (
                element.width*(wave.x - parallax - Math.floor(wave.x - parallax - camera.x + 0.5))
                + Math.sin(rotation)*wave.sway*scaleFactor
            )
            let y = element.height*wave.y + Math.cos(rotation)*wave.sway*scaleFactor

            let boatCloseness = boat.closeness*totalWaves
            if (!boatDrawn && wave.closeness > boatCloseness) {
                boat.render()
                boatDrawn = true
            }

            let red = Math.round(255 - 255.0/(wave.closeness/(totalWaves/4) + 1))
            let green = Math.round(255 - 105/(wave.closeness/(totalWaves/4) + 1))
            let alpha = Math.min(
                1,
                Math.abs(boatCloseness - wave.closeness)/100 + Math.abs(boat.x - x/element.width)*3
            )

            context.fillStyle = `rgba(${red}, ${green}, 0, ${alpha})`
            context.beginPath()
            context.moveTo(x - distance*2.5, y + distance*0.75)
            context.lineTo(x, y)
            context.lineTo(x + distance*2.5, y + distance*0.75)
            context.closePath()

            context.fill()
        }

        context.restore()

        // Wind arrow
        context.save()

        context.translate(element.width - 120, element.height - 110)

        context.save()
        context.font = '40px sans-serif'
        context.strokeStyle = 'white'
        context.lineWidth = 6
        context.strokeText('breeze', -context.measureText('breeze').width/2, 70)
        context.fillStyle = 'maroon'
        context.fillText('breeze', -context.measureText('breeze').width/2, 70)
        context.restore()

        context.scale(wind.x*8, 4)
        let arrowRotation = (wind.x + 1)*Math.PI/2
        let y = -Math.sin(arrowRotation)/2
        context.fillStyle = 'brown'
        context.beginPath()
        context.moveTo(arrowPoints[0], arrowPoints[1] + y*arrowPoints[0])
        for (let i = 2; i < arrowPoints.length; i += 2) {
            context.lineTo(arrowPoints[i], arrowPoints[i + 1] + y*arrowPoints[i])
        }
        context.closePath()
        context.fillStyle = 'brown'
        context.fill()
        context.strokeStyle = 'white'
        context.stroke()

        context.restore()

        requestAnimationFrame(loop)
    }
    loop()
}
