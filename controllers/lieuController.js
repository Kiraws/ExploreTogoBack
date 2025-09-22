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
  upload.array('images', 10),

  async (req, res) => {
    try {
      let imageUrls = [];
      if (req.files && req.files.length > 0) {
        imageUrls = await imageService.processUploadedImages(req.files);
      }

      const requestData = {
        ...req.body,
        etabImages: imageUrls
      };

      // ✅ Normaliser certains champs
      if (typeof requestData.etabJour === "string") {
        try {
          requestData.etabJour = JSON.parse(requestData.etabJour);
        } catch {
          requestData.etabJour = [];
        }
      }

      if (requestData.etablissement_type) {
        requestData.etablissementType = requestData.etablissement_type;
      }

      if (typeof requestData.status === "string") {
        requestData.status = requestData.status === "true";
      }

      // ✅ Validation principale
      const lieuValidation = lieuSchema.safeParse(requestData);
      if (!lieuValidation.success) {
        if (imageUrls.length > 0) {
          await imageService.deleteMultipleImages(imageUrls);
        }
        return res.status(400).json({
          success: false,
          error: "Données invalides",
          details: lieuValidation.error.issues
        });
      }

      const validatedData = lieuValidation.data;

      // ✅ Validation spécifique par type
      let specificValidation;
      let specificData = {};

      switch (validatedData.type) {
        case 'loisirs':
          specificValidation = loisirsSchema.safeParse(requestData);
          if (specificValidation.success) {
            specificData = { etablissementType: specificValidation.data.etablissement_type };
          } else {
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
          specificData = specificValidation.success ? specificValidation.data : {};
          break;
        case 'marches':
          specificValidation = marchesSchema.safeParse(requestData);
          specificData = specificValidation.success ? specificValidation.data : {};
          break;
        case 'sites':
          specificValidation = sitesSchema.safeParse(requestData);
          specificData = specificValidation.success ? specificValidation.data : {};
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
            error: "Type de lieu invalide"
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

      const lieuData = {
        ...validatedData,
        specificData: lieuService.prepareSpecificData(validatedData.type, specificData)
      };

      const result = await lieuService.createLieu(lieuData);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: result.message,
          imagesCount: imageUrls.length
        });
      } else {
        if (imageUrls.length > 0) {
          await imageService.deleteMultipleImages(imageUrls);
        }
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Erreur dans createLieu:", error);

      if (req.files && req.files.length > 0) {
        const imageUrls = await imageService.processUploadedImages(req.files);
        await imageService.deleteMultipleImages(imageUrls);
      }

      res.status(500).json({
        success: false,
        error: "Erreur interne du serveur",
        message: error.message
      });
    }
  }
];

/**
 * Mettre à jour un lieu avec gestion des images
 */
const path = require('path');


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

      let finalImageUrls = existingLieu.data.etabImages || [];
      console.log('finalImageUrls initial:', finalImageUrls); // Log pour débogage
      // Normaliser les séparateurs et reconstruire les URLs décomposées
      finalImageUrls = finalImageUrls.map(url => {
        if (typeof url === 'string') {
          return url.replace(/\\/g, '/');
        }
        if (typeof url === 'object' && url !== null) {
          const pathParts = Object.keys(url)
            .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
            .map(key => url[key]);
          const path = pathParts.join('');
          return path ? path.replace(/\\/g, '/') : '';
        }
        console.warn('URL non valide dans finalImageUrls:', url);
        return '';
      }).filter(url => typeof url === 'string' && url !== '');
      console.log('finalImageUrls après normalisation:', finalImageUrls); // Log pour débogage

      // 2. Traitement des nouvelles images si présentes
      let newImageUrls = [];
      if (req.files && req.files.length > 0) {
        newImageUrls = await imageService.processUploadedImages(req.files);
        newImageUrls = newImageUrls.map(url => {
          if (typeof url === 'string') {
            return url.replace(/\\/g, '/');
          }
          console.warn('URL non valide dans newImageUrls:', url);
          return '';
        }).filter(url => typeof url === 'string' && url !== '');
        console.log('newImageUrls:', newImageUrls); // Log pour débogage
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
      } else if (newImageUrls.length > 0) {
        // Ajouter les nouvelles images aux images existantes
        finalImageUrls = [...finalImageUrls, ...newImageUrls];
        console.log('finalImageUrls après ajout:', finalImageUrls); // Log pour débogage
      }

      // 4. Gestion de la suppression d'images spécifiques si demandée
      if (data.imagesToDelete) {
        let imagesToDelete;
        try {
          imagesToDelete = JSON.parse(data.imagesToDelete);
          if (!Array.isArray(imagesToDelete)) {
            throw new Error('imagesToDelete doit être un tableau');
          }
          console.log('imagesToDelete brut:', imagesToDelete); // Log pour débogage
          // Normaliser les URLs dans imagesToDelete pour correspondre aux chemins locaux
          imagesToDelete = imagesToDelete.map(url => {
            if (typeof url === 'string') {
              // Supprimer le préfixe http://localhost:3030/ et ajuster le chemin
              const localPath = url.replace(/^http:\/\/localhost:3030\//, 'E:/Open Data Science/ExploreTogoBack/');
              return localPath.replace(/\\/g, '/');
            }
            if (typeof url === 'object' && url !== null) {
              const pathParts = Object.keys(url)
                .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
                .map(key => url[key]);
              return pathParts.join('').replace(/\\/g, '/');
            }
            console.warn('URL non valide dans imagesToDelete:', url);
            return '';
          }).filter(url => typeof url === 'string' && url !== '');
          console.log('imagesToDelete normalisé:', imagesToDelete); // Log pour débogage
          console.log('finalImageUrls avant filtrage:', finalImageUrls); // Log pour débogage
          // Vérifier que les URLs à supprimer existent dans finalImageUrls
          imagesToDelete = imagesToDelete.filter(url => finalImageUrls.includes(url));
          if (imagesToDelete.length === 0) {
            console.log('Aucune image à supprimer n\'est présente dans etabImages');
          } else {
            await imageService.deleteMultipleImages(imagesToDelete);
            finalImageUrls = finalImageUrls.filter(url => !imagesToDelete.includes(url));
          }
          console.log('finalImageUrls après filtrage:', finalImageUrls); // Log pour débogage
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
      }

      // 5. Mettre à jour les données avec les nouvelles URLs d'images
      data.etabImages = finalImageUrls;
      console.log('data.etabImages envoyé à updateLieu:', data.etabImages); // Log pour débogage

      // 6. Nettoyer les champs du body
      delete data.imagesToDelete;
      delete data.replaceImageIndex;

      // 7. Effectuer la mise à jour
      const result = await lieuService.updateLieu(id, data, req.files);

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