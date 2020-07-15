// to host files and facilitate discovery
const path = require('path')
const { createProxyMiddleware } = require('http-proxy-middleware')

const ports = {
    express: 10081,
    signalhub: 10080
}

const { spawn } = require('child_process')

const signalChild = spawn(`npm${process.platform === 'win32' ? '.cmd' : ''}`,
    ['run', 'signalhub', '--', '-p', `${ports.signalhub}`])
signalChild.stdout.on('data', (data) => {
    console.log(`SIGNAL ${data}`)
})


const express = require('express')
const app = express()

app.use('/signal/*', createProxyMiddleware({
    target: `http://127.0.0.1:${ports.signalhub}`,
    changeOrigin: false,
    pathRewrite: (path) => path.replace('/signal', '')
}));

app.use(express.static('public'))
app.use('*', (req, res) => res.sendFile(path.join(__dirname, '/public/index.html')))

app.listen(ports.express, () => console.log(`serving files on ${ports.express}`))