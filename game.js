window.onload = function() {
    let element = document.getElementById('game')
    let context = element.getContext('2d', {alpha: false})
    let mX, mY, scaleFactor
    let initialTime = Date.now()
    let timeElapsed = 0

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

    let mountains = []
    let totalMountains = 2000
    for (let i = 0; i < totalMountains; i++) {
        mountains.push({
            closeness: i,
            x: Math.random(),
            y: 0.3 + (Math.random()/5) + 0.7*i/totalMountains,
            initialRotation: Math.random()*Math.PI*2,
            rotationSpeed: (Math.random()*1 + 1)*Math.sign(Math.random() - 0.5),
            sway: Math.random()*30 + 10
        })
    }
    let BoatClass = {
        x: 0, y: 0, rotation: 0,
        create: function(x, y) {
            return Object.create(BoatClass, {x: {value: x}, y: {value: y}})
        },
        render: function() {
            context.save()
            // Initial transform
            context.scale(scaleFactor, scaleFactor)
            context.translate(this.x, this.y)
            context.rotate(this.rotation)

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
    let boat = BoatClass.create(mX, mY, 0)
    let loop = () => {
        timeElapsed = (Date.now() - initialTime)/1000

        for (let mountain of mountains) {
            mountain.rotation += mountain.rotationSpeed
            let distance = (mountain.closeness*0.10 + 10000/totalMountains + 400)*scaleFactor
            let rotation = mountain.initialRotation + mountain.rotationSpeed*timeElapsed
            let x = element.width*mountain.x + Math.sin(rotation)*mountain.sway*scaleFactor
            let y = element.height*mountain.y + Math.cos(rotation)*mountain.sway*scaleFactor

            let red = Math.round(255 - 255.0/(mountain.closeness/(totalMountains/4) + 1))
            let green = Math.round(255 - 105/(mountain.closeness/(totalMountains/4) + 1))

            context.fillStyle = `rgb(${red}, ${green}, 0)`
            context.beginPath()
            context.moveTo(x - distance, y + distance*0.75)
            context.lineTo(x, y - distance*0.25)
            context.lineTo(x + distance, y + distance*0.75)
            context.closePath()

            context.fill()

            boat.render()
        }
        requestAnimationFrame(loop)
    }
    loop()
}
