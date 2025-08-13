const jwt = require('../libraries/JWT');
const db = require('../libraries/Database');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'Non autorisé', message: 'Token manquant ou invalide' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = await jwt.verifyToken(token);

    // Vérifie si la session est toujours active
    const session = await db.query(
      `SELECT * FROM "Sessions" WHERE token = $1 AND user_id = $2 AND expires_at > NOW()`,
      [token, decoded.id]
    );

    if (session.rowCount === 0) {
      return res.status(401).json({ status: 'Non autorisé', message: 'Session expirée ou inexistante' });
    }

    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'Non autorisé', message: 'Token invalide ou expiré' });
  }
};

module.exports = authMiddleware;
