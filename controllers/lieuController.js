const lieuService = require('../services/LieuService');
const imageService = require('../services/ImageService');
const upload = require('../middleware/Upload');
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
 * Créer un lieu avec gestion des images - méthode unifiée
 */
exports.createLieu = [
  // Middleware multer pour gérer l'upload des images
  upload.array('images', 10), // Max 10 images
  
  async (req, res) => {
    try {
      // 1. Traitement des images uploadées
      let imageUrls = [];
      if (req.files && req.files.length > 0) {
        imageUrls = await imageService.processUploadedImages(req.files);
      }

      // 2. Préparation des données avec les URLs des images
      const requestData = {
        ...req.body,
        etabImages: imageUrls // Ajouter les URLs des images
      };

      // 3. Validation du schéma principal
      const lieuValidation = lieuSchema.safeParse(requestData);
      
      if (!lieuValidation.success) {
        // Nettoyer les images uploadées en cas d'erreur de validation
        if (imageUrls.length > 0) {
          await imageService.deleteMultipleImages(imageUrls);
        }
        
        return res.status(400).json({
          success: false,
          error: 'Données invalides',
          details: lieuValidation.error.issues
        });
      }

      const validatedData = lieuValidation.data;

      // 4. Validation des données spécifiques selon le type
      let specificValidation;
      let specificData = {};

      switch (validatedData.type) {
        case 'loisirs':
          specificValidation = loisirsSchema.safeParse(requestData);
          if (specificValidation.success) {
            specificData = { etablissementType: specificValidation.data.etablissement_type };
          } else {
            // Nettoyer les images en cas d'erreur
            if (imageUrls.length > 0) {
              await imageService.deleteMultipleImages(imageUrls);
            }
            return res.status(400).json({
              success: false,
              error: 'Données spécifiques invalides pour les loisirs',
              details: specificValidation.error.errors
            });
          }
          break;
        
        case 'parcs':
          specificValidation = parcsSchema.safeParse(requestData);
          if (specificValidation.success) {
            specificData = specificValidation.data;
          } else {
            if (imageUrls.length > 0) {
              await imageService.deleteMultipleImages(imageUrls);
            }
            return res.status(400).json({
              success: false,
              error: 'Données spécifiques invalides pour les parcs',
              details: specificValidation.error.errors
            });
          }
          break;
        
        case 'marches':
          specificValidation = marchesSchema.safeParse(requestData);
          if (specificValidation.success) {
            specificData = specificValidation.data;
          } else {
            if (imageUrls.length > 0) {
              await imageService.deleteMultipleImages(imageUrls);
            }
            return res.status(400).json({
              success: false,
              error: 'Données spécifiques invalides pour les marchés',
              details: specificValidation.error.errors
            });
          }
          break;
        
        case 'sites':
          specificValidation = sitesSchema.safeParse(requestData);
          if (specificValidation.success) {
            specificData = specificValidation.data;
          } else {
            if (imageUrls.length > 0) {
              await imageService.deleteMultipleImages(imageUrls);
            }
            return res.status(400).json({
              success: false,
              error: 'Données spécifiques invalides pour les sites naturels',
              details: specificValidation.error.errors
            });
          }
          break;

        case 'hotels':
          specificValidation = hotelsSchema.safeParse(requestData);
          break;
        
        case 'zones':
          specificValidation = zonesSchema.safeParse(requestData);
          break;
        
        case 'supermarches':
          specificValidation = supermarchesSchema.safeParse(requestData);
          break;
        
        case 'touristique':
          specificValidation = touristiqueSchema.safeParse(requestData);
          break;

        default:
          if (imageUrls.length > 0) {
            await imageService.deleteMultipleImages(imageUrls);
          }
          return res.status(400).json({
            success: false,
            error: 'Type de lieu invalide'
          });
      }

      if (specificValidation && !specificValidation.success) {
        if (imageUrls.length > 0) {
          await imageService.deleteMultipleImages(imageUrls);
        }
        return res.status(400).json({
          success: false,
          error: `Données spécifiques invalides pour ${validatedData.type}`,
          details: specificValidation.error.errors
        });
      }

      // 5. Préparer les données pour le service
      const lieuData = {
        ...validatedData,
        specificData: lieuService.prepareSpecificData(validatedData.type, specificData)
      };

      // 6. Créer le lieu
      const result = await lieuService.createLieu(lieuData);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: result.message,
          imagesCount: imageUrls.length
        });
      } else {
        // Nettoyer les images en cas d'échec de création
        if (imageUrls.length > 0) {
          await imageService.deleteMultipleImages(imageUrls);
        }
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Erreur dans createLieu:', error);
      
      // Nettoyer les images en cas d'erreur
      if (req.files && req.files.length > 0) {
        const imageUrls = await imageService.processUploadedImages(req.files);
        await imageService.deleteMultipleImages(imageUrls);
      }
      
      res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur',
        message: error.message
      });
    }
  }
];

/**
 * Mettre à jour un lieu avec gestion des images
 */
exports.updateLieu = [
  upload.array('images', 10), // Nouvelles images à ajouter ou remplacer
  
  async (req, res) => {
    try {
      const { id } = req.params;
      let data = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID du lieu requis'
        });
      }

      // 1. Récupérer le lieu existant pour obtenir les images actuelles
      const existingLieu = await lieuService.getLieuById(id);
      if (!existingLieu.success) {
        if (req.files && req.files.length > 0) {
          const newImageUrls = await imageService.processUploadedImages(req.files);
          await imageService.deleteMultipleImages(newImageUrls);
        }
        return res.status(404).json(existingLieu);
      }

      let finalImageUrls = (existingLieu.data.etabImages || []).map(item => {
      if (typeof item === 'object' && item !== null) {
        return Object.values(item).join('');
      }
      return item;
    });

      // 2. Traitement des nouvelles images si présentes
      let newImageUrls = [];
      if (req.files && req.files.length > 0) {
        newImageUrls = await imageService.processUploadedImages(req.files);
      }

      // 3. Gestion du remplacement d'une image par index
      if (data.replaceImageIndex) {
        let replaceIndex;
        try {
          replaceIndex = parseInt(data.replaceImageIndex, 10);
          if (isNaN(replaceIndex) || replaceIndex < 0 || replaceIndex >= finalImageUrls.length) {
            throw new Error('Index d\'image invalide');
          }
        } catch (error) {
          if (newImageUrls.length > 0) {
            await imageService.deleteMultipleImages(newImageUrls);
          }
          return res.status(400).json({
            success: false,
            error: 'Index d\'image invalide',
            details: error.message
          });
        }

        // Vérifier qu'une image a été uploadée pour le remplacement
        if (newImageUrls.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Aucune image uploadée pour le remplacement'
          });
        }

        // Supprimer l'ancienne image à l'index spécifié
        const oldImageUrl = finalImageUrls[replaceIndex];
        await imageService.deleteImage(oldImageUrl);

        // Remplacer l'image à l'index par la première nouvelle image
        finalImageUrls[replaceIndex] = newImageUrls[0];

        // Supprimer les images uploadées excédentaires
        if (newImageUrls.length > 1) {
          const excessImages = newImageUrls.slice(1);
          await imageService.deleteMultipleImages(excessImages);
          newImageUrls = newImageUrls.slice(0, 1);
        }
      }

      // 4. Gestion de la suppression d'images spécifiques si demandée
      if (data.imagesToDelete) {
        let imagesToDelete;
        try {
          imagesToDelete = JSON.parse(data.imagesToDelete);
          if (!Array.isArray(imagesToDelete)) {
            throw new Error('imagesToDelete doit être un tableau');
          }
        } catch (error) {
          if (newImageUrls.length > 0) {
            await imageService.deleteMultipleImages(newImageUrls);
          }
          return res.status(400).json({
            success: false,
            error: 'Format invalide pour imagesToDelete',
            details: error.message
          });
        }
        await imageService.deleteMultipleImages(imagesToDelete);
        finalImageUrls = finalImageUrls.filter(url => !imagesToDelete.includes(url));
      }

      // 5. Ajouter les nouvelles images non utilisées pour le remplacement
      if (newImageUrls.length > 0 && !data.replaceImageIndex) {
        finalImageUrls = [...finalImageUrls, ...newImageUrls];
      }

      // 6. Mettre à jour les données avec les nouvelles URLs d'images
      data.etabImages = finalImageUrls;

      // 7. Nettoyer les champs du body
      delete data.imagesToDelete;
      delete data.replaceImageIndex;

      // 8. Effectuer la mise à jour
      const result = await lieuService.updateLieu(id, data);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Erreur dans updateLieu:', error);
      
      // Nettoyer les nouvelles images en cas d'erreur
      if (req.files && req.files.length > 0) {
        const imageUrls = await imageService.processUploadedImages(req.files);
        await imageService.deleteMultipleImages(imageUrls);
      }
      
      res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
      });
    }
  }
];
/**
 * Supprimer un lieu avec nettoyage des images
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

    // 1. Récupérer les images avant suppression
    const existingLieu = await lieuService.getLieuById(id);
    
    // 2. Supprimer le lieu
    const result = await lieuService.deleteLieu(id);

    if (result.success) {
      // 3. Nettoyer les images associées
      if (existingLieu.success && existingLieu.data.etabImages) {
        await imageService.deleteMultipleImages(existingLieu.data.etabImages);
      }
      
      res.status(200).json({
        ...result,
        message: 'Lieu et images supprimés avec succès'
      });
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

// Garder les autres méthodes inchangées
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

exports.getAllLieux = async (req, res) => {
  try {
    const result = await lieuService.getAllLieux();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Erreur dans getAllLieux:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
};