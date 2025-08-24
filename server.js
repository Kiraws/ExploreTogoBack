const express = require('express');
const apiRoute = require('./routes/api');
const authRoute = require('./routes/auth');
const authMiddleware = require('./middleware/auth_middleware');
const passport = require('./config/passport');
const session = require('express-session');
require('dotenv').config();
console.log('JWT_SECRET:', process.env.JWT_SECRET);
const path = require('path');

const app = express();
const port = process.env.PORT;

// Configuration pour servir les fichiers statiques (images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware pour gérer les erreurs CORS si nécessaire
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Route pour tester l'accès aux images
app.get('/test-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'uploads', 'lieux', filename);
  
  // Vérifier si le fichier existe
  require('fs').access(imagePath, require('fs').constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ 
        success: false, 
        error: 'Image non trouvée' 
      });
    }
    
    res.sendFile(imagePath);
  });
});

// Endpoint pour supprimer une image spécifique
app.delete('/api/images/:filename', async (req, res) => {
  try {
    const imageService = require('./services/ImageService');
    const filename = req.params.filename;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const imageUrl = `${baseUrl}/uploads/lieux/${filename}`;
    
    const result = await imageService.deleteImage(imageUrl);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'image'
    });
  }
});

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