import swarm from './libs/webrtc-swarm.mjs'
import signalhub from './libs/signalhub.mjs'
import { getTracks, getTurnouts, getTrains, setTrains } from './railyard.js'
import { makeTrack } from './primitives/track.js'

// { peerid: { trainid: data } }
const remoteTrains = { }

let eventQueue = []

const markAsNetworked = (obj, id) => {
    return {
        ...obj,
        remote: true,
        owner: id
    }
}

const hydrateTrack = (trackData) => {
    const newTrack = makeTrack(...trackData.points)
}

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

        remoteTrains[id] = {}

        // set up data listener on new peer
        peer.on('data', (data) => {
            const parsed = JSON.parse(data)
            parsed.trains.forEach(train => {
                remoteTrains[id][train.id] = markAsNetworked(train, id)
            })
            // TODO: do this
            // parsed.tracks.forEach(track => {
            //     remoteTrains[id][track.id] = markAsNetworked(track, id)
            // })
        })
    
        // send a message
        const peerInterval = setInterval(() => {
            // package up all the local trains
            const networkPacket = {
                trains: getTrains().filter(train => !train.remote),
                tracks: []
            }

            // go through events and add data to packet
            let event
            while(event = eventQueue.shift()) {
                switch(event.type) {
                    case 'track':
                        networkPacket.tracks.push(event.data)
                    break
                }
            }

            // send data
            peer.send(JSON.stringify(networkPacket))
        }, 1000)

        peer.on('error', (error) => console.log('ERROR', error))

        peer.on('close', () => {
            console.log('CLOSE')
            // stop sending data
            clearInterval(peerInterval)
            
            // remove any remote trains belonging to this player
            delete remoteTrains[id]
        })
    })
}

export const sanitizeTrack = (track) => {
    return {
        id: track.id,
        points: track.points
    }
}

export const networkedTrainTool = {
    update: () => {
        let allTrains = getTrains()
        const allPlayers = Object.keys(remoteTrains)
        allTrains = allTrains.filter(train => !train.remote || allPlayers.includes(train.owner))
        setTrains(allTrains)

        Object.values(remoteTrains)
            .flatMap(player => Object.values(player))
            .forEach(remoteTrain => {
                let localRemoteTrainIndex = allTrains.findIndex(train => train.id === remoteTrain.id)
                if(localRemoteTrainIndex === -1) {
                    // TODO: fade in effect
                    allTrains.push(remoteTrain)
                } else {
                    // TODO: rubberband
                    allTrains[localRemoteTrainIndex] = remoteTrain
                }
            })
    },
    trackcreate: ({detail: newTrack}) => {
        eventQueue.push({
            type: 'track',
            data: sanitizeTrack(newTrack)
        })
    }
}