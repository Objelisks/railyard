// to host files and facilitate discovery

const ports = {
    express: 8081,
    signalhub: 8080
}

const { spawn } = require('child_process')

const signalChild = spawn(`npm.cmd`, ['run', 'signalhub'])
signalChild.stdout.on('data', (data) => {
    console.log(`SIGNAL ${data}`)
})


const express = require('express')
const app = express()

app.use(express.static('public'))

app.listen(ports.express, () => console.log(`serving files on ${ports.express}`))