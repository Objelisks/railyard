const EsmWebpackPlugin = require("@purtuga/esm-webpack-plugin")
const path = require('path')

module.exports = {
    mode: "production",
    entry: {
        'uuid': 'uuid',
        'gl-matrix': 'gl-matrix',
        'regl': 'regl'
    },
    output: {
        path: path.resolve(__dirname, "public/src/libs"),
        filename: "[name].mjs",
        library: "LIB",
        libraryTarget: "var"
    },
    plugins: [
        new EsmWebpackPlugin()
    ]
}