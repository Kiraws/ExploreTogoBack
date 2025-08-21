const lieuService = require('../services/LieuService');
const z = require('zod');
const { 
  lieuSchema,
  loisirsSchema,
  hotelsSchema,
  parcsSchema,
  marchesSchema,
  sitesSchema,
  zonesSchema,
  supermarchesSchema,
  touristiqueSchema
} = require('../schemas/apiShema');

/**
 * Créer un lieu - méthode unifiée
 */
exports.createLieu = async (req, res) => {
  try {
    // 1. Validation du schéma principal
    const lieuValidation = lieuSchema.safeParse(req.body);
    
    if (!lieuValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: lieuValidation.error.issues
      });
    }

    const validatedData = lieuValidation.data;

    // 2. Validation des données spécifiques selon le type
    let specificValidation;
    let specificData = {};

    switch (validatedData.type) {
      case 'loisirs':
        specificValidation = loisirsSchema.safeParse(req.body);
        if (specificValidation.success) {
          specificData = { etablissementType: specificValidation.data.etablissement_type };
        } else {
          return res.status(400).json({
            success: false,
            error: 'Données spécifiques invalides pour les loisirs',
            details: specificValidation.error.errors
          });
        }
        break;
      
      case 'parcs':
        specificValidation = parcsSchema.safeParse(req.body);
        if (specificValidation.success) {
          specificData = specificValidation.data;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Données spécifiques invalides pour les parcs',
            details: specificValidation.error.errors
          });
        }
        break;
      
      case 'marches':
        specificValidation = marchesSchema.safeParse(req.body);
        if (specificValidation.success) {
          specificData = specificValidation.data;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Données spécifiques invalides pour les marchés',
            details: specificValidation.error.errors
          });
        }
        break;
      
      case 'sites':
        specificValidation = sitesSchema.safeParse(req.body);
        if (specificValidation.success) {
          specificData = specificValidation.data;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Données spécifiques invalides pour les sites naturels',
            details: specificValidation.error.errors
          });
        }
        break;

      case 'hotels':
        specificValidation = hotelsSchema.safeParse(req.body);
        break;
      
      case 'zones':
        specificValidation = zonesSchema.safeParse(req.body);
        break;
      
      case 'supermarches':
        specificValidation = supermarchesSchema.safeParse(req.body);
        break;
      
      case 'touristique':
        specificValidation = touristiqueSchema.safeParse(req.body);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Type de lieu invalide'
        });
    }

    if (specificValidation && !specificValidation.success) {
      return res.status(400).json({
        success: false,
        error: `Données spécifiques invalides pour ${validatedData.type}`,
        details: specificValidation.error.errors
      });
    }

    // 3. Préparer les données pour le service
    const lieuData = {
      ...validatedData,
      specificData: lieuService.prepareSpecificData(validatedData.type, specificData)
    };

    // 4. Créer le lieu
    const result = await lieuService.createLieu(lieuData);

    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur dans createLieu:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur',
      message: error.message
    });
  }
};

/**
 * Récupérer un lieu par ID
 */
exports.getLieu = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID du lieu requis'
      });
    }

    const result = await lieuService.getLieuById(id);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Erreur dans getLieu:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
};

/**
 * Mettre à jour un lieu
 */
exports.updateLieu = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID du lieu requis'
      });
    }

    const result = await lieuService.updateLieu(id, data);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Erreur dans updateLieu:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
};

/**
 * Supprimer un lieu
 */
exports.deleteLieu = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID du lieu requis'
      });
    }

    const result = await lieuService.deleteLieu(id);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur dans deleteLieu:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
};

/**
 * Désactiver un lieu
 */
exports.desactivateLieu = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID du lieu requis'
      });
    }

    const result = await lieuService.desactivateLieu(id);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur dans desactivateLieu:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
};