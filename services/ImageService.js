// 2. Service pour gérer les images
// Dans un fichier services/ImageService.js
const fs = require('fs').promises;
const path = require('path');

class ImageService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../uploads/lieux');
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  /**
   * Traiter les fichiers uploadés et retourner les URLs
   */
  async processUploadedImages(files) {
    if (!files || files.length === 0) {
      return [];
    }

    return files.map(file => {
      return `${this.baseUrl}/uploads/lieux/${file.filename}`;
    });
  }

  /**
   * Supprimer une image du serveur
   */
  async deleteImage(imageUrl) {
    try {
      // Extraire le nom du fichier de l'URL
      const filename = path.basename(imageUrl);
      const filePath = path.join(this.uploadsDir, filename);
      
      // Vérifier si le fichier existe avant de le supprimer
      await fs.access(filePath);
      await fs.unlink(filePath);
      
      return { success: true, message: 'Image supprimée avec succès' };
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'image:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Supprimer plusieurs images
   */
  async deleteMultipleImages(imageUrls) {
    const results = [];
    
    for (const imageUrl of imageUrls) {
      const result = await this.deleteImage(imageUrl);
      results.push({ imageUrl, ...result });
    }
    
    return results;
  }

  /**
   * Valider les images existantes (vérifier si les fichiers existent)
   */
  async validateExistingImages(imageUrls) {
    const validImages = [];
    
    for (const imageUrl of imageUrls) {
      try {
        const filename = path.basename(imageUrl);
        const filePath = path.join(this.uploadsDir, filename);
        await fs.access(filePath);
        validImages.push(imageUrl);
      } catch (error) {
        console.log(`Image non trouvée: ${imageUrl}`);
      }
    }
    
    return validImages;
  }
}

module.exports = new ImageService();