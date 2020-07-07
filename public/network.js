import swarm from './libs/webrtc-swarm.mjs'
import signalhub from './libs/signalhub.mjs'
import { addTrack, getTracks, setTracks, getTurnouts, setTurnouts, addTrain, getTrains, setTrains, detectAndFixTurnouts } from './railyard.js'
import { makeTrack, addToBush, removeFromBush } from './primitives/track.js'
import { toggleTurnout } from './primitives/turnout.js'


// don't need to sync turnout objects, because those can be inferred from tracks
// do need to sync turnout open state
// if everyone uses the same algorithm to generate turnouts, can just index into the turnout list

// { 
//    [peerid]: { 
//        trains: {
//            [trainid]: train
//        },
//        tracks: {
//            [trackid]: track
//        },
//    }
// }
const remoteData = { }

let outgoingEvents = []
let incomingEvents = []
const OUTGOING_FREQUENCY = 1000

const markAsNetworked = (obj, id) => {
    return {
        ...obj,
        remote: true,
        owner: id
    }
}

const hydrateTrack = (trackData) => {
    const newTrack = makeTrack(...trackData.points)
    newTrack.id = trackData.id
    return newTrack
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
        console.log('found a new friend', id, 'total', sw.peers.length)

        remoteData[id] = {
            trains: {},
            tracks: {}
        }

        /// INCOMING
        // parse incoming data and create network objects or queue incoming events
        peer.on('data', (data) => {
            const parsed = JSON.parse(data)
            parsed.trains.forEach(train => {
                remoteData[id].trains[train.id] = markAsNetworked(train, id)
            })
            parsed.tracks.forEach(trackData => {
                const track = hydrateTrack(trackData)
                remoteData[id].tracks[track.id] = markAsNetworked(track, id)
            })
            parsed.turnouts.forEach(turnout => {
                incomingEvents.push({
                    type: 'turnoutswitch',
                    index: turnout.index
                })
            })
        })
    
        /// OUTGOING
        // send a message
        const peerInterval = setInterval(() => {
            // package up all the local trains
            const networkPacket = {
                trains: getTrains().filter(train => !train.remote),
                tracks: [],
                turnouts: []
            }

            // go through events and add data to packet
            let event
            while(event = outgoingEvents.shift()) {
                switch(event.type) {
                    case 'createtrack':
                        networkPacket.tracks.push(event.data)
                        break
                    case 'turnoutswitch':
                        networkPacket.turnouts.push(event.data)
                        break
                }
            }

            // send data
            peer.send(JSON.stringify(networkPacket))
        }, OUTGOING_FREQUENCY)

        peer.on('error', (error) => console.log('oh no', error))

        peer.on('close', () => {
            console.log('a friend has left', id)
            // stop sending data
            clearInterval(peerInterval)
            
            // remove any remote data belonging to this player
            delete remoteData[id]
        })
    })
}

export const sanitizeTrack = (track) => {
    return {
        id: track.id,
        index: track.index,
        points: track.points
    }
}
export const sanitizeTurnout = (turnout) => {
    return {
        id: turnout.id,
        index: turnout.index,
        open: turnout.open
    }
}

const syncNetworkList = (list, type, addList, setList) => {
    const allPlayers = Object.keys(remoteData)
    const exit = list.filter(local => local.remote && !allPlayers.includes(local.owner))
    list = list.filter(local => !local.remote || allPlayers.includes(local.owner))
    setList(list)

    const enter = []
    Object.values(remoteData)
        .flatMap(player => Object.values(player[type]))
        .forEach(remote => {
            let localRemoteIndex = list.findIndex(local => local.id === remote.id)
            if(localRemoteIndex === -1) {
                // TODO: fade in effect
                // new
                addList(remote)
                enter.push(remote)
            } else {
                // TODO: rubberband
                // update
                list[localRemoteIndex] = remote
            }
        })
    return [enter, exit]
}

export const networkedTrainTool = {
    update: () => {
        syncNetworkList(getTrains(), 'trains', addTrain, setTrains)
        const [enter, exit] = syncNetworkList(getTracks(), 'tracks', addTrack, setTracks)
        enter.forEach((track) => {
            addToBush(track)
        })
        exit.forEach((track) => {
            removeFromBush(track)
        })
        if(enter.length > 0 || exit.length > 0) {
            detectAndFixTurnouts()
        }

        let event
        while(event = incomingEvents.shift()) {
            switch(event.type) {
                case 'turnoutswitch':
                    toggleTurnout(getTurnouts()[event.index], false)
                    break
            }
        }


        // todo: sync turnouts
        // turnouts are weird bc any player can switch one, but what if two players disagree on the final state
        // might need to introduce ticks here
        // order events based on shared tick, and then we have some kind of more deterministic state
        // how to sync tick
        // for now lets just send switch events and itll converge as long as packets aren't dropped
    },
    trackcreate: ({detail: newTrack}) => {
        detectAndFixTurnouts()
        outgoingEvents.push({
            type: 'createtrack',
            data: sanitizeTrack(newTrack)
        })
    },
    turnoutswitch: ({detail: turnout}) => {
        outgoingEvents.push({
            type:'turnoutswitch',
            data: sanitizeTurnout(turnout)
        })
    }
}