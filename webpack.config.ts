const path = require('path');
const GasWebpackPlugin = require('gas-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: 'production',
  entry: './src/main.ts',
  cache: true,
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'Code.gs',
  },
  module: {
    rules: [
      // {
      //   test: /\.ts$/,
      //   enforce: 'pre',
      //   loader: 'eslint-loader',
      //   options: {
      //     fix: true,
      //     failOnError: true,
      //     failOnWarning: true,
      //   },
      // },
      {
        test: /\.ts$/,
        use: 'ts-loader',
      },
      {
        test: /\.html$/i,
        loader: "html-loader",
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      "fs": false,
      // "os": false,
      // "path": false,
      "url": false,
      "tls": false,
      "net": false,
      // "zlib": false,
      // "http": false,
      // "https": false,
      // "stream": false,
      // "crypto": false,
      // "assert": false,
      // "util": false,
      // "constants": false,
      // "process": false,
      "child_process": false,
      "dns": false,
      "nock": false,
      "aws-sdk": false,
      "mock-aws-s3": false,
      "bluebird": false,
      // "npm": false,
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "os": require.resolve("os-browserify"),
      "path": require.resolve("path-browserify"),
      "zlib": require.resolve("browserify-zlib"),
      "assert": require.resolve("assert/"),
      "util": require.resolve("util/"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "constants": require.resolve("constants-browserify"),
    },
  },
  // externals: { 'sqlite3': 'commonjs sqlite3', },
  // externalsPresets: { node: true },
  // externals: [
  //   nodeExternals({
  //     allowlist: [/\.(?!(?:cs?|html)$).{1,5}$/i],
  //   }),
  // ],
  // externals: [nodeExternals()],
  externals: { 'node-gyp': 'commonjs node-gyp', },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/appsscript.json',
          to: 'appsscript.json',
        },
      ],
    }),
    new GasWebpackPlugin(),
    new ESLintPlugin(),
  ],
};
