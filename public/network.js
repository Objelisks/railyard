import regl from './regl.js'
import signalhub from './libs/signalhub.mjs'
import swarm from './libs/webrtc-swarm.mjs'
import { makeTrack } from './primitives/track.js'
import { toggleTurnout } from './primitives/turnout.js'
import { addTrack, getTracks, setTracks, getTurnouts, addTrain, getTrains, setTrains } from './railyard.js'
import { addToTrackBush, removeFromTrackBush } from './raycast.js'
import { detectAndFixTurnouts } from './railyardhelpers.js'


// don't need to sync turnout objects, because those can be inferred from tracks
// do need to sync turnout open state
// if everyone uses the same algorithm to generate turnouts, can just index into the turnout list
// don't want to directly sync turnout state, because no one owns a turnout and if we sync'd against old state
// it would get into an infinite loop of flipping the turnouts

// todo: initial state:
// hello, i am me, here are my things
//  hello, i am me, here are my things


// there's no difference between joining someone in an existing room, and someone joining you in an existing room
// dedupe tracks
// todo: index turnouts based on location
// ghost train button (ghost train by default?)
// todo: what happens when you unghost inside a train??
//  either: simulation waits until its safe to unghost before actually applying unghostliness
//  or: players need to unghost other players (seems bad to let other players affect yr setup without your consent)
// todo: need to make it easier to disentangle trains


// todo: sync turnouts
// turnouts are weird bc any player can switch one, but what if two players disagree on the final state
// might need to introduce ticks here
// order events based on shared tick, and then we have some kind of more deterministic state
// how to sync tick
// for now lets just send switch events and itll converge as long as packets aren't dropped

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
const OUTGOING_FREQUENCY = 1 // per sec
let lastUpdate = 0
let sw = null

const markAsNetworked = (obj, id) => {
    return {
        ...obj,
        remote: true,
        owner: id,
        ghost: true
    }
}

const hydrateTrack = (trackData) => {
    const newTrack = makeTrack(...trackData.points)
    newTrack.id = trackData.id
    return newTrack
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

const isSameTrack = (trackA, trackB) => {
    return trackA.points.toString() === trackB.points.toString()
}

const dedupeAgainstLocalTracks = (remoteTracks) => {
     // note: maybe need to dedupe against other remote tracks?
    const localTracks = getTracks().filter(track => !track.remote)
    Object.keys(remoteTracks).forEach(remoteTrackId => {
        const remoteTrack = remoteTracks[remoteTrackId]
        if(localTracks.some(localTrack => isSameTrack(localTrack, remoteTrack))) {
            delete remoteTracks[remoteTrackId]
        }
    })
}

const signalUrl = `${window.location.origin}/signal`

export const connect = (room) => {
    const roomName = `railyard-${room}`
    const hub = signalhub(roomName, [signalUrl])
    sw = swarm(hub)
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
            if(parsed.type === 'initial') {
                dedupeAgainstLocalTracks(remoteData[id].tracks)
            }
            parsed.turnouts.forEach(turnout => {
                incomingEvents.push({
                    type: 'turnoutswitch',
                    index: turnout.index
                })
            })
        })

        const initialPacket = {
            type: 'initial',
            trains: getTrains().filter(train => !train.remote),
            tracks: getTracks().filter(track => !track.remote).map(track => sanitizeTrack(track)),
            turnouts: [] // todo
        }

        peer.send(JSON.stringify(initialPacket))
    
        peer.on('error', (error) => console.log('oh no', error))

        peer.on('close', () => {
            console.log('a friend has left', id)
            
            // remove any remote data belonging to this player
            delete remoteData[id]
            // todo: disconnect our trains from remote trains
        })
    })
}

export const networkedTrainTool = {
    update: () => {
        // send some stuff outwards
        if(sw !== null && regl.now() > lastUpdate + OUTGOING_FREQUENCY) {
            // package up all the local trains
            const networkPacket = {
                type: 'update',
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

            // pack it up
            const packetStringified = JSON.stringify(networkPacket)

            // send data to all the friends
            sw.peers.forEach(peer => peer.send(packetStringified))
            lastUpdate = regl.now()
        }

        // deal with incoming stuff
        syncNetworkList(getTrains(), 'trains', addTrain, setTrains)
        const [enter, exit] = syncNetworkList(getTracks(), 'tracks', addTrack, setTracks)
        //dedupeTracks()
        enter.forEach((track) => {
            addToTrackBush(track)
        })
        exit.forEach((track) => {
            removeFromTrackBush(track)
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