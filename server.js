// to host files and facilitate discovery

const ports = {
    express: 8080,
    signalhub: 8081
}

const { spawn } = require('child_process')

const signalChild = spawn(`npm.cmd`, ['run', 'signalhub'])
signalChild.stdout.on('data', (data) => {
    console.log(`SIGNAL ${data}`)
})


const express = require('express')
const app = express()

app.use('/choo', express.static('node_modules/choo/dist/'))
app.use(express.static('public'))

app.listen(ports.express, () => console.log(`serving files on ${ports.express}`))