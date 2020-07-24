const MiniCssExtractPlugin = require('mini-css-extract-plugin');
var svgToMiniDataURI = require('mini-svg-data-uri');
const path = require('path');

const mode = process.env.NODE_ENV || 'development';
const prod = mode === 'production';

const sveltePath = path.resolve('node_modules', 'svelte')

module.exports = {
	entry: {
		bundle: ['./src/main.js']
	},
	resolve: {
		alias: {
			svelte: sveltePath,
		},
		extensions: ['.mjs', '.js', '.svelte'],
		mainFields: ['svelte', 'browser', 'module', 'main']
	},
	output: {
		path: __dirname + ('/public'),
		filename: 'index.js',
		chunkFilename: '[name].[id].js',
		libraryTarget: 'umd',
        umdNamedDefine: true
	},
	module: {
		rules: [
			// Rules are chained bottom to top. Babel rule must probably be one of
			// the last of the chain, so it must come first in the array.
			{
				test: /\.(?:svelte|m?js)$/,
				// Svelte internals, under node_modules MUST be included.
				//
				// Babel 7 ignores node_modules automatically, but not if they're
				// explicitely included.
				// see: https://github.com/babel/babel-loader/issues/171#issuecomment-486380160
				//
				include: [path.resolve(__dirname, 'src'), path.dirname(sveltePath)],
				use: {
					loader: 'babel-loader',
				},
			},
			{
				test: /\.svelte$/,
				use: {
					loader: 'svelte-loader',
					options: {
						emitCss: true,
						hotReload: true
					}
				}
			},
			{
				test: /\.css$/,
				use: [
					/**
					 * MiniCssExtractPlugin doesn't support HMR.
					 * For developing, use 'style-loader' instead.
					 * */
					(prod && false) ? MiniCssExtractPlugin.loader : 'style-loader',
					'css-loader'
				]
			},
			{
                test: /\.(png|jpe?g|gif|svg)$/i,
                loader: 'url-loader',
                options: {
					esModule: false,
					generator: (content) => svgToMiniDataURI(content.toString()),
                },
            },
		]
	},
	mode,
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].css'
		})
	],
	devtool: prod ? false: 'source-map',
	devServer: {
        disableHostCheck: true,
    }
};
