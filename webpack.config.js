const EsmWebpackPlugin = require("@purtuga/esm-webpack-plugin")
const path = require('path')

module.exports = {
    mode: "production",
    entry: {
        'uuid': 'uuid',
        'gl-matrix': 'gl-matrix',
        'regl': 'regl',
        'resl': 'resl',
        'webrtc-swarm': 'webrtc-swarm',
        'signalhub': 'signalhub',
        'choo': 'choo',
        'bezier-js': 'bezier-js',
        'rbush': 'rbush',
        'nanohtml': 'nanohtml',
        'ray-aabb': 'ray-aabb',
        'parse-dds': 'parse-dds',
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