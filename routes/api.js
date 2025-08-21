const express = require('express');
const router = express.Router();
const lieuController = require('../controllers/lieuController');
const userController = require('../controllers/userController');
const loisirsController = require('../controllers/loisirsController');
const menuController = require('../controllers/menuController');
const likesController = require('../controllers/likesController');
const marchesController = require('../controllers/marchesController');

// Middleware de validation des IDs
const validateId = (req, res, next) => {
  const { id } = req.params;
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      success: false,
      error: 'ID invalide'
    });
  }
  next();
};

// Middleware de logging pour le développement
const logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};

// Application du middleware de logging en développement
if (process.env.NODE_ENV === 'development') {
  router.use(logRequest);
}

// ==================== ROUTES LIEU ====================
// Route unifiée pour créer tout type de lieu
router.post('/lieux', lieuController.createLieu);

// Routes de gestion des lieux
router.get('/lieux/:id', validateId, lieuController.getLieu);
router.put('/lieux/:id', validateId, lieuController.updateLieu);
router.delete('/lieux/:id', validateId, lieuController.deleteLieu);
router.patch('/lieux/:id/desactivate', validateId, lieuController.desactivateLieu);

// ==================== ROUTES USER ====================
router.get('/users/:id', userController.getUser);

// ==================== ROUTES LOISIRS ====================
// Routes spécifiques aux loisirs
router.put('/loisirs/:id', validateId, loisirsController.updateLoisir);
router.get('/loisirs/:id', validateId, loisirsController.getLoisir);

// Routes des menus pour les loisirs
router.post('/loisirs/:id/menus', validateId, loisirsController.createMenu);
router.get('/loisirs/:id/menus', validateId, loisirsController.getMenus);

// ==================== ROUTES MENU ====================
router.post('/menus/:menuId/categories', menuController.createCategorie);
router.post('/categories/:categorieId/plats', menuController.createPlat);

// ==================== ROUTES LIKES ====================
router.post('/lieux/:id/likes', validateId, likesController.addLike);
router.delete('/lieux/:id/likes', validateId, likesController.removeLike);

// ==================== ROUTES MARCHES ====================
router.get('/marches/:id', validateId, marchesController.getMarche);
router.put('/marches/:id', validateId, marchesController.updateMarche);

// ==================== ROUTES FUTURES (commentées pour l'instant) ====================
// Ces routes peuvent être décommentées quand les contrôleurs seront créés
/*
const sitesNaturelsController = require('../controllers/sitesNaturelsController');
const zonesProtegeesController = require('../controllers/zonesProtegeesController');
const supermarchesController = require('../controllers/supermarchesController');
const etablissementsTouristiquesController = require('../controllers/etablissementsTouristiquesController');

router.get('/sites-naturels/:id', validateId, sitesNaturelsController.getSiteNaturel);
router.put('/sites-naturels/:id', validateId, sitesNaturelsController.updateSiteNaturel);

router.get('/zones-protegees/:id', validateId, zonesProtegeesController.getZoneProtegee);
router.put('/zones-protegees/:id', validateId, zonesProtegeesController.updateZoneProtegee);

router.get('/supermarches/:id', validateId, supermarchesController.getSupermarche);
router.put('/supermarches/:id', validateId, supermarchesController.updateSupermarche);

router.get('/etablissements-touristiques/:id', validateId, etablissementsTouristiquesController.getEtablissementTouristique);
router.put('/etablissements-touristiques/:id', validateId, etablissementsTouristiquesController.updateEtablissementTouristique);
*/

// ==================== ROUTES AVANCÉES (futures) ====================
// Routes pour la recherche et le filtrage
/*
router.get('/lieux/search', lieuController.searchLieux);
router.get('/lieux/filter/:type', lieuController.getLieuxByType);
router.get('/lieux/region/:region', lieuController.getLieuxByRegion);
router.get('/lieux/nearby', lieuController.getNearbyLieux);
*/

// Middleware de gestion des erreurs 404
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    path: req.originalUrl
  });
});

module.exports = router;