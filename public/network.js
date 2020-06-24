import swarm from './libs/webrtc-swarm.mjs'
import signalhub from './libs/signalhub.mjs'

export const connect = (room) => {
    const roomName = `railyard-${room}`
    const hub = signalhub(roomName, ['127.0.0.1:8080'])
    const sw = swarm(hub)
    console.log(`connecting to ${roomName}`)

    // cleanup on page unload
    window.addEventListener('beforeunload', () => {
        sw.close()
        hub.close()
    })

    // listen for new peers
    sw.on('peer', (peer, id) => {
        console.log('connected to peer', id, 'total', sw.peers.length)
        // set up data listener on new peer
        peer.on('data', (data) => {
            console.log(`from: ${id}`, data)
        })
    })
    
    // send a test message
    setInterval(() => {
        sw.peers.forEach((peer) => peer.send({hello: `peer ${peer.id}`}))
    }, 1000)
}