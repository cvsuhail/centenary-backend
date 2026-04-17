const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const errorMiddleware = require('./middlewares/error.middleware');
const routes = require('./routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api', routes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'SAMASTHA CENTENARY BACKEND API' });
});

// Error handling
app.use(errorMiddleware);

module.exports = app;
