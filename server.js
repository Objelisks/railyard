// to host files and facilitate discovery

const ports = {
    express: 8080,
    signalhub: 3000
}

const { spawn } = require('child_process')

spawn(`npm.cmd`, ['run', 'signalhub', 'listen', '-p', `${ports.signalhub}`])
console.log(`signalling on ${ports.signalhub}`)

const express = require('express')
const app = express()

app.use('/choo', express.static('node_modules/choo/dist/'))
app.use(express.static('public'))

app.listen(ports.express, () => console.log(`serving files on ${ports.express}`))