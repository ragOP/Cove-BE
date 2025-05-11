require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectToDatabase } = require('./config/db');

const { PORT, MONGODB_URI } = process.env;

// Check if required environment variables are set
if (!PORT || !MONGODB_URI) {
  console.error('Missing required environment variables: PORT, MONGODB_URI', {
    PORT,
    MONGODB_URI,
  });
  process.exit(1);
}

// Connect to MongoDB
connectToDatabase(MONGODB_URI);

// Start the server
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
