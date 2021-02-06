const path = require("path");

module.exports = {
  output: {
    filename: `worker.js`,
    path: path.join(__dirname, "dist"),
  },
  mode: "production",
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    plugins: [],
    alias: {
      fs: path.resolve(__dirname, "./null.js"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
        },
      },
    ],
  },
};
