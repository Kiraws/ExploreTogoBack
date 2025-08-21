const express = require('express');
const apiRoute = require('./routes/api');
const authRoute = require('./routes/auth');
const authMiddleware = require('./middleware/auth_middleware');
const passport = require('./config/passport');
const session = require('express-session');
require('dotenv').config();
console.log('JWT_SECRET:', process.env.JWT_SECRET);

const app = express();
const port = process.env.PORT;

// Middleware pour parser les corps JSON
app.use(express.json());

// Configuration de la session
app.use(session({
  secret: process.env.JWT_SECRET || '1a2b3cece',
  resave: false,
  saveUninitialized: false,
}));

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// Utilisation des routes
app.use('/api', authMiddleware, apiRoute);
app.use('/auth', authRoute); // Pas de middleware global ici

// Routes spécifiques protégées peuvent être ajoutées si nécessaire
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
  next();
});


app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});