require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectToDatabase } = require('./config/db');

const { MONGODB_URI } = process.env;

const { NODE_ENV } = process.env;
const PORT = process.env.PORT || 5001

// Check if required environment variables are set
if (!MONGODB_URI || !NODE_ENV || !PORT) {
  console.error('Missing required environment variables: MONGODB_URI, NODE_ENV, PORT', {
    MONGODB_URI,
    NODE_ENV,
    PORT,
  });
  process.exit(1);
}

// Connect to MongoDB
connectToDatabase(MONGODB_URI);

// Start the server
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${NODE_ENV} mode`);
});
