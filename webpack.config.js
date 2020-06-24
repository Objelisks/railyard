const EsmWebpackPlugin = require("@purtuga/esm-webpack-plugin")
const path = require('path')

module.exports = {
    mode: "production",
    entry: {
        'uuid': 'uuid',
        'gl-matrix': 'gl-matrix',
        'regl': 'regl',
        'webrtc-swarm': 'webrtc-swarm',
        'signalhub': 'signalhub'
    },
    output: {
        path: path.resolve(__dirname, "public/libs"),
        filename: "[name].mjs",
        library: "LIB",
        libraryTarget: "var"
    },
    plugins: [
        new EsmWebpackPlugin()
    ]
}