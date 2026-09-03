import 'dotenv/config';
import app from './app.js';
import { env } from './config/env.js';
import connectDB from './db/connection.js';

const PORT = env.port || process.env.PORT || 4000;

// Connect to MongoDB
connectDB();

app.listen(PORT, () => {
  console.log(`FinRecon AI server listening on port ${PORT}`);
});
