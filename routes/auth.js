const express = require('express');
const passport = require('passport');
const { 
    register,
    forgotPassword,
    resetPassword,
    deleteAccount,
    updateProfile,
    getProfile

    }= require('../controllers/authController');
const router = express.Router();
const jwt = require('../Libraries/Jwt');
const authMiddleware = require('../middleware/auth_middleware');

router.post('/register', register);

router.post('/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, async (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || 'Authentification échouée' });
    }
    try {
      const token = await jwt.generateToken({ id: user.id });
      return res.status(200).json({
        message: 'Connexion réussie',
        accessToken: token,
        user: {
          id: user.id,
          name: user.name,
          firstname: user.firstname,
          email: user.email,
        },
      });
    } catch (err) {
      return res.status(500).json({ message: 'Erreur lors de la génération du token', error: err.message });
    }
  })(req, res, next);
});

router.post('/logout', authMiddleware, (req, res) => {
  req.logout(() => {
    res.status(200).json({ message: 'Déconnexion réussie' });
  });
});
// Configuration des routes
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.delete('/delete-account', require('../middleware/auth_middleware'), deleteAccount);
router.put('/update-profile', require('../middleware/auth_middleware'), updateProfile);
router.get('/profile', require('../middleware/auth_middleware'), getProfile);


module.exports = router;