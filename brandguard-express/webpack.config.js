const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const isEnvProduction = process.env.NODE_ENV === "production";

module.exports = {
  mode: isEnvProduction ? "production" : "development",
  devtool: "source-map",

  entry: {
    index: "./src/ui/index.tsx",
    code: "./src/sandbox/code.ts",
  },

  experiments: {
    outputModule: true,
  },

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    module: true,
    clean: true,
  },

  externalsType: "module",
  externalsPresets: { web: true },
  externals: {
    "add-on-sdk-document-sandbox": "add-on-sdk-document-sandbox",
    "express-document-sdk": "express-document-sdk",
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },

  resolve: {
    extensions: [".tsx", ".ts", ".js", ".css"],
  },

  plugins: [
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "./src/ui/index.html",
      scriptLoading: "module",
      chunks: ["index"],
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: "src/*.json", to: "[name][ext]" }],
    }),
  ],
};
