// webpack.config.js
import path from 'path';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const mode = process.env.NODE_ENV || 'development';

export default {
  mode,
  entry: './src/index.js', // ← aquí
  output: {
    filename: 'main.js', // nombre del bundle JS
    path: path.resolve(process.cwd(), 'dist'), // carpeta de salida
    publicPath: '/assets/', // para fastify-static
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'main.css', // nombre del bundle CSS
    }),
  ],
};
