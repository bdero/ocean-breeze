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
            e.preventDefault()
            return false
        }
    }
    document.addEventListener('keydown', keyCallback(true))
    document.addEventListener('keyup', keyCallback(false))

    function asymptote(dist, divisor, dt) {
        return (1 - 1/(dt/divisor + 1))*dist
    }

    function isColliding(xDist, yDist, r1, r2, reverse=false) {
        let r = r1 + r2
        if (!reverse)
            return xDist*xDist + yDist*yDist < r*r
        else
            return xDist*xDist + yDist*yDist > r*r
    }

    function distance(xDist, yDist) {
        return Math.sqrt(xDist*xDist + yDist*yDist)
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
    let waterStartColor = [248, 165, 84]
    let waterEndColor = [179, 63, 239]
    for (let i = 0; i < totalWaves; i++) {
        let red = Math.round(waterStartColor[0] + asymptote(waterEndColor[0] - waterStartColor[0], 200, i/totalWaves*900))
        let green = Math.round(waterStartColor[1] + asymptote(waterEndColor[1] - waterStartColor[1], 200, i/totalWaves*900))
        let blue = Math.round(waterStartColor[2] + asymptote(waterEndColor[2] - waterStartColor[2], 200, i/totalWaves*900))
        waves.push({
            closeness: i,
            x: -0.5 + Math.random(),
            y: -0.5 + 0.3 + (Math.random()/5) + 0.7*i/totalWaves,
            initialRotation: Math.random()*Math.PI*2,
            rotationSpeed: (Math.random()*1 + 1)*Math.sign(Math.random() - 0.5),
            sway: Math.random()*20 + 5,
            color: `${red}, ${green}, ${blue}`
        })
    }

    let wind = {
        x: 0
    }

    // Boat setup
    let BoatClass = {
        accelRate: 0.2, frictionRate: 0.1, maxSpeed: 0.35,
        x: 0, rotation: -Math.PI/2, closeness: 0,
        xOffset: 220,
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
            this.vX += (this.sailPosition*wind.x/10 + wind.x/60)*timeDelta
            if (actions.moveUp.active)
                this.vY = Math.max(-this.maxSpeed, this.vY - this.accelRate*timeDelta)
            if (actions.moveDown.active)
                this.vY = Math.min(this.maxSpeed, this.vY + this.accelRate*timeDelta)
            this.vX = Math.min(this.maxSpeed, Math.max(0, Math.abs(this.vX)*(1 - this.frictionRate*timeDelta))) * Math.sign(this.vX)
            this.vY = Math.max(0, Math.abs(this.vY) - this.frictionRate*timeDelta) * Math.sign(this.vY)

            this.x += this.vX*timeDelta
            this.closeness = Math.max(0.02, Math.min(0.98, this.closeness + this.vY*timeDelta))

            if (this.closeness === 0.02 || this.closeness === 0.98)
                this.vY = 0
        },
        render: function() {
            let noiseX = simplex.noise(400, timeElapsed/4)*22
            let noiseY = simplex.noise(500, timeElapsed*0.75)*16 + simplex.noise(700, timeElapsed*3)*Math.abs(this.vX)*12
            let noiseRotation = simplex.noise(600, timeElapsed*0.40)/8 + simplex.noise(800, timeElapsed*2.5)*Math.abs(this.vX)/7

            let rotationDestination = 0
            let xOffsetDestination = 0
            if (disableControls) {
                rotationDestination = -Math.PI/2
                xOffsetDestination = 220
            }
            this.rotation += asymptote(rotationDestination - this.rotation, 0.8, timeDelta)
            this.xOffset += asymptote(xOffsetDestination - this.xOffset, 0.6, timeDelta)

            // Initial transform
            context.translate(noiseX, noiseY + this.xOffset)
            context.scale(0.8, 0.8)
            context.rotate(this.rotation + this.vX/1.5 + wind.x/15 + noiseRotation)
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
            context.scale(0.9 - this.sailPosition/5 + this.sailPosition*wind.x*simplex.noise(1100, timeElapsed*10)/15, 1)
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
        }
    }
    let boat = BoatClass.create(0, 0.5)

    let launchButton = document.getElementById('launch-button')
    launchButton.onclick = () => {
        if (disableControls) {
            console.log('Launch game')

            boat = BoatClass.create(0, 0.5)
            camera.destinationX = 0
            camera.x = 0
            simplex = new SimplexNoise()

            let launchModal = document.getElementById('launch-modal')
            launchModal.classList.add('hide')

            for (let action of Object.keys(actions))
                actions[action].active = false

            disableControls = false
            element.tabIndex = 1
        }
    }

    let endGame = () => {
        let launchModal = document.getElementById('launch-modal')
        launchModal.classList.remove('hide')
        disableControls = true
    }

    function renderGameObject(gameObject, currentWave) {
        if (!gameObject.drawn && currentWave.closeness > gameObject.closeness*totalWaves) {
            context.save()
            context.scale(scaleFactor, scaleFactor)
            context.translate(
                element.width*gameObject.x/scaleFactor,
                element.height*(-0.5 + 0.3 + 0.7*gameObject.closeness)/scaleFactor
            )
            gameObject.render()
            context.restore()
            gameObject.drawn = true
        }
    }

    function drawPolygon(points) {
        context.beginPath()
        context.moveTo(points[0], points[1])
        for (let i = 2; i < points.length; i += 2) {
            context.lineTo(points[i], points[i + 1])
        }
        context.closePath()
        context.fill()
    }

    let rockStartColor = [180, 120, 135]
    let rockEndColor = [141, 72, 167]
    function renderRock() {
        let points = []
        for (let i = 0; i < 2*Math.PI; i += 2*Math.PI/30) {
            let noise = (
                simplex.noise3d(this.x*293.32, this.closeness*851.49, i)
                + simplex.noise3d(this.x*217.3, this.closeness*926.21, i*4)/4
                + simplex.noise3d(this.x*629.3, this.closeness*456.7, i*16)/8
                + 3
            )*this.size

            points.push(
                Math.sin(i)*noise,
                Math.cos(i)*noise
            )
        }
        let red = Math.round(rockStartColor[0] + (rockEndColor[0] - rockStartColor[0])*this.closeness)
        let green = Math.round(rockStartColor[1] + (rockEndColor[1] - rockStartColor[1])*this.closeness)
        let blue = Math.round(rockStartColor[2] + (rockEndColor[2] - rockStartColor[2])*this.closeness)
        context.fillStyle = `rgb(${red}, ${green}, ${blue})`
        context.translate(0, element.height*0.06/scaleFactor)
        drawPolygon(points)
    }

    // Game loop
    let loop = () => {
        context.fillStyle = 'rgb(255, 202, 100)'
        context.fillRect(0, 0, element.width, element.height)

        let prevTimeElapsed = timeElapsed
        timeElapsed = (Date.now() - initialTime)/1000
        timeDelta = timeElapsed - prevTimeElapsed

        // Compute wind
        wind.x = Math.sin(
            Math.min(1, Math.max(-1,
                simplex.noise(900, timeElapsed/12)
                + simplex.noise(1000, timeElapsed*4)/16
            ))*Math.PI/2
        ) + simplex.noise(1200, timeElapsed*2)/7
        wind.x = Math.min(1, Math.abs(wind.x))*Math.sign(wind.x)

        // Compute rocks
        let cameraRockBaseX = Math.round(camera.x*10)/10
        let rocks = []
        for (let x = -0.5; x <= 0.5 ; x += 0.1) {
            for (let y = 0; y <= 1; y += 0.1) {
                let rockX = x + cameraRockBaseX
                let rockNoise = simplex.noise3d(100, rockX*70, y*70)
                if (rockNoise > 0.85 - Math.abs(rockX)/300 && !(rockX > -1 && rockX < 1)) {
                    let rock = {
                        x: rockX + simplex.noise(1344, y*1384)*0.05,
                        closeness: y + simplex.noise(1489, rockX*1482)*0.05,
                        size: 15 + (simplex.noise(rockX*849.32, y*552.2) + 1)*30,
                        drawn: false
                    }
                    rock.render = renderRock.bind(rock)
                    rocks.push(rock)
                }
            }
        }

        if (!disableControls)
            boat.update()

        // Rock collision
        for (let rock of rocks) {
            let rockRadius = rock.size/2400
            let rockCloseness = rock.closeness - rock.size/1200
            if (isColliding(rock.x - boat.x, rockCloseness - boat.closeness, 0.1, rockRadius)) {
                let angleFromRock = Math.atan2(boat.closeness - rockCloseness, boat.x - rock.x)
                let distance = 0.1 + rockRadius
                let previousX = boat.x
                let previousY = boat.closeness
                boat.x = rock.x + Math.cos(angleFromRock)*distance
                boat.closeness = rockCloseness + Math.sin(angleFromRock)*distance
                boat.vX *= 0.9
                boat.vY *= 0.9
                if (isColliding((boat.x - previousX)*10000, (boat.closeness - previousY)*10000, 3.5, 0, true)) {
                    endGame()
                }
                boat.vX = boat.vY = 0
            }
        }

        context.save()

        // Camera calculations
        camera.destinationZoom = 1.4 - Math.abs(boat.vX)*0.8
        camera.zoom += asymptote(camera.destinationZoom - camera.zoom, 30, timeElapsed)
        context.scale(camera.zoom, camera.zoom)

        camera.historyCursor = (camera.historyCursor + 1)%camera.destinationXHistory.length
        camera.destinationXHistory[camera.historyCursor] = boat.x + boat.vX*1.3
        camera.destinationX = camera.destinationXHistory.reduce((x, y) => x + y)/camera.destinationXHistory.length
        camera.x += asymptote(camera.destinationX - camera.x, 0.8, timeDelta)
        camera.y = boat.closeness - 0.3

        context.translate(
            mX/camera.zoom - element.width*(camera.x + simplex.noise(100, timeElapsed/5)/100),
            mY/camera.zoom - element.height*(camera.y/5 + simplex.noise(200, timeElapsed/5)/100 + camera.zoom/7 - 0.1)
        )

        // Render scene
        boat.drawn = false
        for (let wave of waves) {
            wave.rotation += wave.rotationSpeed
            let distance = (10000/totalWaves + 200)*scaleFactor
            let rotation = wave.initialRotation + wave.rotationSpeed*timeElapsed
            let parallax = camera.x*wave.closeness*0.0004
            let x = (
                element.width*(wave.x - parallax - Math.floor(wave.x - parallax - camera.x + 0.5))
                + Math.sin(rotation)*wave.sway*scaleFactor
            )
            let y = element.height*wave.y + Math.cos(rotation)*wave.sway*scaleFactor

            renderGameObject(boat, wave)

            for (let rock of rocks) {
                renderGameObject(rock, wave)
            }

            let alpha = Math.min(
                1,
                Math.abs(boat.closeness*totalWaves - wave.closeness)/100 + Math.abs(boat.x - x/element.width)*3
            )

            context.fillStyle = `rgba(${wave.color}, ${alpha})`
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
        context.font = '30px sans-serif'
        context.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        context.lineWidth = 3
        context.fillStyle = 'rgba(255, 255, 255, 0.8)'
        context.strokeText('breeze', -context.measureText('breeze').width/2, 70)
        context.fillText('breeze', -context.measureText('breeze').width/2, 70)
        context.restore()

        context.scale(Math.sin(wind.x*Math.PI/2)*8, 4)
        let arrowRotation = (wind.x + 1)*Math.PI/2
        let y = -Math.sin(arrowRotation)/2
        context.beginPath()
        context.moveTo(arrowPoints[0], arrowPoints[1] + y*arrowPoints[0])
        for (let i = 2; i < arrowPoints.length; i += 2) {
            context.lineTo(arrowPoints[i], arrowPoints[i + 1] + y*arrowPoints[i])
        }
        context.closePath()
        context.fillStyle = 'brown'
        context.fill()
        context.strokeStyle = 'rgba(255, 255, 255, 0.7)'
        context.stroke()

        context.restore()

        // Distance text
        context.save()

        let distance = (Math.round(boat.x*150)/10).toString()
        if (distance[distance.length - 2] !== '.') {
            distance += '.0'
        }

        context.translate(element.width/2, element.height - 120)
        context.font = '50px sans-serif'
        context.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        context.lineWidth = 3
        context.fillStyle = 'rgba(255, 255, 255, 0.8)'
        context.strokeText(distance, 50 - context.measureText(distance).width, 70)
        context.fillText(distance, 50 - context.measureText(distance).width, 70)

        context.restore()

        requestAnimationFrame(loop)
    }
    loop()
}
