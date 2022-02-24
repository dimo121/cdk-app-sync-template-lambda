import { Configuration } from 'webpack'
import { resolve } from 'path'

const config: Configuration = {

    mode: 'none',
    entry: {
        'blogLambda': './services/blog.js',
        'userLambda': './services/user.js',
        'entryLambda': './services/entry.js'
    },
    target: 'node',
    module: {
        rules: [
            {
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.webpack.json'
                    }
                }
            }
        ]
    },
    externals: {
        'aws-sdk': 'aws-sdk'
    },
    resolve: {
        extensions: ['.js','.ts']
    },
    output: {
        libraryTarget: 'commonjs2',
        path: resolve(__dirname, 'build'),
        filename: '[name]/[name].js'
    }
}

export default config;
