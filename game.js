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
            for (let action of Object.keys(actions)) {
                for (let keyCode of actions[action].keyCodes) {
                    if (keyCode === e.code) {
                        actions[action].active = activate
                    }
                }
            }
        }
    }
    document.addEventListener('keydown', keyCallback(true))
    document.addEventListener('keyup', keyCallback(false))

    let simplex = new SimplexNoise()

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
        x: 0, y: 0, rotation: 0, closeness: 0,
        create: function(x, closeness) {
            return Object.create(BoatClass, {
                x: {value: x, writable: true},
                closeness: {value: closeness, writable: true}
            })
        },
        render: function() {
            context.save()
            // Initial transform
            let noiseX = simplex.noise(400, timeElapsed/2)*22
            let noiseY = simplex.noise(500, timeElapsed*0.75)*16
            let noiseRotation = simplex.noise(600, timeElapsed*0.40)/8

            if (actions.moveUp.active)
                this.closeness = Math.max(0, this.closeness - timeDelta/3)
            if (actions.moveDown.active)
                this.closeness = Math.min(0.98, this.closeness + timeDelta/3)
            this.y = -0.5 + 0.3 + 0.7*this.closeness

            context.scale(scaleFactor, scaleFactor)
            context.translate(element.width*this.x/scaleFactor + noiseX, element.height*this.y/scaleFactor + noiseY)
            context.rotate(this.rotation + noiseRotation)
            context.translate(-15, -90)

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
    let loop = () => {
        let prevTimeElapsed = timeElapsed
        timeElapsed = (Date.now() - initialTime)/1000
        timeDelta = timeElapsed - prevTimeElapsed

        context.save()
        context.translate(mX, mY)

        let boatDrawn = false
        // Draw water
        for (let mountain of mountains) {
            mountain.rotation += mountain.rotationSpeed
            let distance = (mountain.closeness*0.10 + 10000/totalMountains + 400)*scaleFactor
            let rotation = mountain.initialRotation + mountain.rotationSpeed*timeElapsed
            let x = element.width*mountain.x + Math.sin(rotation)*mountain.sway*scaleFactor
            let y = element.height*mountain.y + Math.cos(rotation)*mountain.sway*scaleFactor

            let red = Math.round(255 - 255.0/(mountain.closeness/(totalMountains/4) + 1))
            let green = Math.round(255 - 105/(mountain.closeness/(totalMountains/4) + 1))

            if (!boatDrawn && mountain.closeness > boat.closeness*totalMountains) {
                boat.render()
                boatDrawn = true
            }

            context.fillStyle = `rgba(${red}, ${green}, 0, 0.9)`
            context.beginPath()
            context.moveTo(x - distance, y + distance*0.75)
            context.lineTo(x, y - distance*0.25)
            context.lineTo(x + distance, y + distance*0.75)
            context.closePath()

            context.fill()
        }

        context.restore()
        requestAnimationFrame(loop)
    }
    loop()
}
