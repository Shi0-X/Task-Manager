import dotenv from 'dotenv';
import app from '../src/index.js';

dotenv.config();

const port = process.env.PORT || 3000;

app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
