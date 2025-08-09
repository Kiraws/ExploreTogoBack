// server.js
const express = require('express');
const apiRoute = require('./routes/api');
const authRoute = require('./routes/auth');
const authMiddleware = require('./middleware/auth_middleware'); // Correction du nom
const migrateRoute = require('./routes/migrate');
require('dotenv').config();

const app = express();
const port = process.env.PORT;

// Middleware pour parser les corps JSON
app.use(express.json());

// Utilisation des routes
app.use('/api', authMiddleware, apiRoute);
app.use('/auth', authRoute);
app.use('/migrate', migrateRoute);

app.get('/', (req, res) => {
  res.status(200).json({
    status: 200,
    message: 'Tout fonctionne correctement',
  });
});

app.use((req, res, next) => {
  res.status(404).json({
    statusCode: 404,
    message: 'Point de terminaison non trouvé',
  });
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
});

app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});