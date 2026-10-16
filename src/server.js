require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', rateLimit({ windowMs: 60_000, max: 60 }), routes);
app.use('/widget', express.static(path.join(__dirname, '../public/widget')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Bella Moda en http://localhost:${port}/widget`));
