const fs = require('fs');
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const logrotate = require('logrotate-stream');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up logging with Morgan
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
  // Rotate log every 10 days and delete old logs
  const accessLogStream = logrotate.createStream({
    file: path.join(logDir, 'access.log'),
    size: '10M',
    compress: true,
    keep: 7,
    date_format: 'YYYY-MM-DD',
    max_age: '10d',
  });

  app.use(morgan('combined', { stream: accessLogStream }));
}

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the cove API');
});

module.exports = app;
