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
        }
        requestAnimationFrame(loop)
    }
    loop()
}
