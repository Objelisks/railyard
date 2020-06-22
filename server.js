// to host files and facilitate discovery

const express = require('express')
const app = express()

const port = 3000

app.use('/choo', express.static('node_modules/choo/dist/'))
app.use('/peerjs', express.static('node_modules/peerjs/dist/'))
app.use('/regl', express.static('node_modules/regl/dist/'))
app.use('/gl-matrix', express.static('node_modules/gl-matrix/'))
app.use(express.static('public'))

app.listen(port, () => console.log(`listening on ${port}`))