// middleware/authMiddleware.js
const jwt = require('../libraries/JWT');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'Non autorisé',
      message: 'Token manquant ou invalide',
      statusCode: 401,
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = await jwt.verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        status: 'Non autorisé',
        message: 'Token invalide ou mal formé',
        statusCode: 401,
      });
    }

    req.userId = decoded.id; // Stocke l'ID de l'utilisateur pour les routes suivantes
    next();
  } catch (err) {
    console.error('Erreur de vérification du token:', err.message);
    return res.status(401).json({
      status: 'Non autorisé',
      message: 'Token invalide ou expiré',
      statusCode: 401,
      error: err.message,
    });
  }
};

module.exports = authMiddleware;