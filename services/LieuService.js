const prisma = require('../Libraries/prisma');

class LieuService {
  
  /**
   * Méthode principale pour créer un lieu avec ses données spécifiques
   */
  async createLieu(data) {
    try {
      // Validation du type
      if (!this.isValidType(data.type)) {
        throw new Error(`Type de lieu invalide: ${data.type}`);
      }

      // Utilisation d'une transaction pour assurer la cohérence
      const result = await prisma.$transaction(async (tx) => {
        // 1. Créer le lieu principal avec une requête brute pour gérer geometry
        const [lieu] = await tx.$queryRaw`
          INSERT INTO "Lieu" (
            etab_images, region_nom, prefecture_nom, commune_nom, canton_nom, nom_localite,
            etab_nom, etab_jour, toilette_type, etab_adresse, type, description,
            activite_statut, activite_categorie, etab_creation_date, geometry, status
          ) VALUES (
            ${data.etabImages || []}::text[],
            ${data.regionNom},
            ${data.prefectureNom},
            ${data.communeNom},
            ${data.cantonNom},
            ${data.nomLocalite || null},
            ${data.etabNom},
            ${data.etabJour || []}::text[],
            ${data.toiletteType || null},
            ${data.etabAdresse || null},
            ${data.type},
            ${data.description || null},
            ${data.activiteStatut || null},
            ${data.activiteCategorie || null},
            ${data.etabCreationDate || null},
            ST_GeomFromText(${data.geometry}, 4326),
            ${data.status ?? true}
          ) RETURNING id;
        `;

        if (!lieu || !lieu.id) {
          throw new Error('Échec de la création du lieu dans la base');
        }

        // 2. Créer l'enregistrement spécialisé selon le type
        await this.createSpecificRecord(tx, lieu.id, data.type, data.specificData);

        // Convertir l'id BigInt en string pour éviter l'erreur de sérialisation JSON
        return { id: lieu.id.toString() };
      });

      return {
        success: true,
        data: result,
        message: `Lieu de type ${data.type} créé avec succès`
      };
    } catch (error) {
      console.error('Erreur lors de la création du lieu:', error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue'
      };
    }
  }

  /**
   * Créer l'enregistrement spécialisé selon le type de lieu
   */
  async createSpecificRecord(tx, lieuId, type, specificData = {}) {
    // Convertir lieuId en BigInt si nécessaire (pour compatibilité avec la base)
    const id = BigInt(lieuId);
    switch (type) {
      case 'loisirs':
        await tx.loisirs.create({
          data: {
            id,
            etablissementType: specificData.etablissementType || specificData.etablissement_type || 'Non spécifié'
          }
        });
        break;

      case 'hotels':
        await tx.hotels.create({
          data: { id }
        });
        break;

      case 'parcs':
        await tx.parcs_Jardins.create({
          data: {
            id,
            terrain: specificData.terrain || 'Non spécifié'
          }
        });
        break;

      case 'marches':
        await tx.marches.create({
          data: {
            id,
            organisme: specificData.organisme || 'Non spécifié'
          }
        });
        break;

      case 'sites':
        await tx.sites_Naturels.create({
          data: {
            id,
            typeSiteDeux: specificData.typeSiteDeux || 'Non spécifié',
            ministereTutelle: specificData.ministereTutelle || 'Non spécifié',
            religion: specificData.religion || 'Néant'
          }
        });
        break;

      case 'zones':
        await tx.zones_Protegees.create({
          data: { id }
        });
        break;

      case 'supermarches':
        await tx.supermarches_Etablissement.create({
          data: { id }
        });
        break;

      case 'touristique':
        await tx.etablissement_Touristique.create({
          data: { id }
        });
        break;

      default:
        throw new Error(`Type de lieu non géré: ${type}`);
    }
  }

      /**
 * Récupérer un lieu par ID avec ses données spécialisées
 */
    async getLieuById(id) {
    try {
        // Étape 1 : Récupérer le type du lieu
        const lieuType = await prisma.lieu.findUnique({
        where: { id: BigInt(id) },
        select: { type: true }
        });

        if (!lieuType) {
        return {
            success: false,
            error: 'Lieu non trouvé'
        };
        }

        // Définir les champs pertinents par type, basés sur les JSON fournis
        const fieldsByType = {
        loisirs: [
            'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'etabNom', 'etabJour',
            'etabAdresse', 'type', 'geometry', 'status', 'etablissementType'
        ],
        hotels: [
            'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
            'toiletteType', 'type', 'geometry', 'status'
        ],
        parcs: [
            'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
            'etabJour', 'toiletteType', 'etabAdresse', 'type', 'activiteStatut', 'activiteCategorie',
            'geometry', 'status', 'terrain'
        ],
        marches: [
            'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
            'etabJour', 'type', 'geometry', 'status', 'organisme'
        ],
        sites: [
            'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
            'etabJour', 'etabAdresse', 'type', 'geometry', 'status', 'typeSiteDeux',
            'ministereTutelle', 'religion'
        ],
        zones: [
            'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
            'type', 'etabCreationDate', 'geometry', 'status'
        ],
        supermarches: [
            'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
            'etabJour', 'toiletteType', 'etabAdresse', 'type', 'activiteStatut', 'activiteCategorie',
            'etabCreationDate', 'geometry', 'status'
        ],
        touristique: [
            'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
            'etabJour', 'etabAdresse', 'type', 'geometry', 'status'
        ]
        };

        // Définir les relations à inclure en fonction du type
        const relationMap = {
        loisirs: { loisirs: true },
        hotels: { hotels: true },
        parcs: { parcsJardins: true },
        marches: { marches: true },
        sites: { sitesNaturels: true },
        zones: { zonesProtegees: true },
        supermarches: { supermarchesEtablissement: true },
        touristique: { etablissementTouristique: true }
        };

        // Étape 2 : Récupérer le lieu avec les relations pertinentes
        const lieu = await prisma.lieu.findUnique({
        where: { id: BigInt(id) },
        include: {
            images: true,
            likes: true,
            favorites: true,
            ...relationMap[lieuType.type] // Inclure uniquement la relation pertinente
        }
        });

        if (!lieu) {
        return {
            success: false,
            error: 'Lieu non trouvé'
        };
        }

        // Étape 3 : Récupérer la géométrie avec une requête brute
        const [geometryResult] = await prisma.$queryRaw`
        SELECT ST_AsEWKT(geometry) AS geometry FROM "Lieu" WHERE id = ${BigInt(id)};
        `;

        // Étape 4 : Convertir les BigInt et les Date en formats sérialisables
        const convertToSerializable = (obj) => {
        if (!obj) return obj;
        const newObj = { ...obj };
        // Convertir BigInt en chaîne
        if (newObj.id && typeof newObj.id === 'bigint') {
            newObj.id = newObj.id.toString();
        }
        // Convertir Date en chaîne ISO
        if (newObj.createdAt instanceof Date) {
            newObj.createdAt = newObj.createdAt.toISOString();
        }
        if (newObj.updatedAt instanceof Date) {
            newObj.updatedAt = newObj.updatedAt.toISOString();
        }
        // Appliquer récursivement aux relations
        for (const key in newObj) {
            if (Array.isArray(newObj[key])) {
            newObj[key] = newObj[key].map(convertToSerializable);
            } else if (typeof newObj[key] === 'object' && newObj[key] !== null) {
            newObj[key] = convertToSerializable(newObj[key]);
            }
        }
        return newObj;
        };

        const convertedLieu = convertToSerializable(lieu);

        // Étape 5 : Filtrer les champs pertinents pour ce type de lieu
        const pertinentFields = fieldsByType[lieuType.type] || [];
        const filteredData = {};

        pertinentFields.forEach(field => {
        if (convertedLieu[field] !== undefined) {
            filteredData[field] = convertedLieu[field];
        }
        });

        // Ajouter les champs communs non listés dans fieldsByType (ex. createdAt, updatedAt, geometry)
        filteredData.createdAt = convertedLieu.createdAt;
        filteredData.updatedAt = convertedLieu.updatedAt;
        filteredData.geometry = geometryResult?.geometry || null;

        // Ajouter la relation pertinente
        const relationKey = lieuType.type === 'loisirs' ? 'loisirs' :
                            lieuType.type === 'hotels' ? 'hotels' :
                            lieuType.type === 'parcs' ? 'parcsJardins' :
                            lieuType.type === 'marches' ? 'marches' :
                            lieuType.type === 'sites' ? 'sitesNaturels' :
                            lieuType.type === 'zones' ? 'zonesProtegees' :
                            lieuType.type === 'supermarches' ? 'supermarchesEtablissement' :
                            'etablissementTouristique';

        filteredData[relationKey] = convertedLieu[relationKey];

        // Ajouter les champs généraux (images, likes, favorites)
        filteredData.images = convertedLieu.images;
        filteredData.likes = convertedLieu.likes;
        filteredData.favorites = convertedLieu.favorites;

        return {
        success: true,
        data: filteredData
        };
    } catch (error) {
        console.error('Erreur lors de la récupération du lieu:', error);
        return {
        success: false,
        error: error.message
        };
    }
    }

/**
 * Mettre à jour un lieu avec ses données spécifiques
 */
async updateLieu(id, data) {
  try {
    // Étape 1 : Vérifier si le lieu existe et récupérer son type
    const lieuType = await prisma.lieu.findUnique({
      where: { id: BigInt(id) },
      select: { type: true }
    });

    if (!lieuType) {
      return {
        success: false,
        error: 'Lieu non trouvé'
      };
    }

    // Étape 2 : Valider le type si fourni (ne pas permettre de changer le type)
    if (data.type && data.type !== lieuType.type) {
      return {
        success: false,
        error: 'Le type du lieu ne peut pas être modifié'
      };
    }

    // Définir les champs pertinents par type, basés sur les JSON fournis
    const fieldsByType = {
      loisirs: [
        'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'etabNom', 'etabJour',
        'etabAdresse', 'type', 'geometry', 'status', 'etablissementType'
      ],
      hotels: [
        'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
        'toiletteType', 'type', 'geometry', 'status'
      ],
      parcs: [
        'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
        'etabJour', 'toiletteType', 'etabAdresse', 'type', 'activiteStatut', 'activiteCategorie',
        'geometry', 'status', 'terrain'
      ],
      marches: [
        'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
        'etabJour', 'type', 'geometry', 'status', 'organisme'
      ],
      sites: [
        'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
        'etabJour', 'etabAdresse', 'type', 'geometry', 'status', 'typeSiteDeux',
        'ministereTutelle', 'religion'
      ],
      zones: [
        'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
        'type', 'etabCreationDate', 'geometry', 'status'
      ],
      supermarches: [
        'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
        'etabJour', 'toiletteType', 'etabAdresse', 'type', 'activiteStatut', 'activiteCategorie',
        'etabCreationDate', 'geometry', 'status'
      ],
      touristique: [
        'regionNom', 'prefectureNom', 'communeNom', 'cantonNom', 'nomLocalite', 'etabNom',
        'etabJour', 'etabAdresse', 'type', 'geometry', 'status'
      ]
    };

    // Étape 3 : Filtrer les données d'entrée pour ne garder que les champs pertinents
    const pertinentFields = fieldsByType[lieuType.type] || [];
    const filteredData = {};
    pertinentFields.forEach(field => {
      if (data[field] !== undefined) {
        filteredData[field] = data[field];
      }
    });

    console.log('filteredData:', filteredData);

    // Étape 4 : Utilisation d'une transaction pour assurer la cohérence
    const result = await prisma.$transaction(async (tx) => {
      // Construire les données pour la mise à jour de la table Lieu
      const updateData = {};
      if (filteredData.etabImages !== undefined) updateData.etabImages = filteredData.etabImages || [];
      if (filteredData.regionNom !== undefined) updateData.regionNom = filteredData.regionNom;
      if (filteredData.prefectureNom !== undefined) updateData.prefectureNom = filteredData.prefectureNom;
      if (filteredData.communeNom !== undefined) updateData.communeNom = filteredData.communeNom;
      if (filteredData.cantonNom !== undefined) updateData.cantonNom = filteredData.cantonNom;
      if (filteredData.nomLocalite !== undefined) updateData.nomLocalite = filteredData.nomLocalite || null;
      if (filteredData.etabNom !== undefined) updateData.etabNom = filteredData.etabNom;
      if (filteredData.etabJour !== undefined) updateData.etabJour = filteredData.etabJour || [];
      if (filteredData.toiletteType !== undefined) updateData.toiletteType = filteredData.toiletteType || null;
      if (filteredData.etabAdresse !== undefined) updateData.etabAdresse = filteredData.etabAdresse || null;
      if (filteredData.description !== undefined) updateData.description = filteredData.description || null;
      if (filteredData.activiteStatut !== undefined) updateData.activiteStatut = filteredData.activiteStatut || null;
      if (filteredData.activiteCategorie !== undefined) updateData.activiteCategorie = filteredData.activiteCategorie || null;
      if (filteredData.etabCreationDate !== undefined) updateData.etabCreationDate = filteredData.etabCreationDate || null;
      if (filteredData.status !== undefined) updateData.status = filteredData.status ?? true;

      // Mettre à jour la table Lieu avec les champs pertinents
      if (filteredData.geometry) {
        await tx.$queryRaw`
          UPDATE "Lieu"
          SET
            etab_images = ${updateData.etabImages || []}::text[],
            region_nom = ${updateData.regionNom || null},
            prefecture_nom = ${updateData.prefectureNom || null},
            commune_nom = ${updateData.communeNom || null},
            canton_nom = ${updateData.cantonNom || null},
            nom_localite = ${updateData.nomLocalite || null},
            etab_nom = ${updateData.etabNom || null},
            etab_jour = ${updateData.etabJour || []}::text[],
            toilette_type = ${updateData.toiletteType || null},
            etab_adresse = ${updateData.etabAdresse || null},
            description = ${updateData.description || null},
            activite_statut = ${updateData.activiteStatut || null},
            activite_categorie = ${updateData.activiteCategorie || null},
            etab_creation_date = ${updateData.etabCreationDate || null},
            geometry = ST_GeomFromText(${filteredData.geometry}, 4326),
            status = ${updateData.status ?? true}
          WHERE id = ${BigInt(id)};
        `;
      } else if (Object.keys(updateData).length > 0) {
        await tx.lieu.update({
          where: { id: BigInt(id) },
          data: updateData
        });
      }

      // Étape 5 : Mettre à jour l'enregistrement spécialisé selon le type
      switch (lieuType.type) {
        case 'loisirs':
          if (filteredData.etablissementType) {
            await tx.loisirs.update({
              where: { id: BigInt(id) },
              data: { etablissementType: filteredData.etablissementType }
            });
          }
          break;
        case 'parcs':
          if (filteredData.terrain) {
            await tx.parcs_Jardins.update({
              where: { id: BigInt(id) },
              data: { terrain: filteredData.terrain }
            });
          }
          break;
        case 'marches':
          if (filteredData.organisme) {
            await tx.marches.update({
              where: { id: BigInt(id) },
              data: { organisme: filteredData.organisme }
            });
          }
          break;
        case 'sites':
          if (filteredData.typeSiteDeux || filteredData.ministereTutelle || filteredData.religion) {
            await tx.sites_Naturels.update({
              where: { id: BigInt(id) },
              data: {
                typeSiteDeux: filteredData.typeSiteDeux || undefined,
                ministereTutelle: filteredData.ministereTutelle || undefined,
                religion: filteredData.religion || undefined
              }
            });
          }
          break;
        // Pas de mise à jour spécifique pour hotels, zones, supermarches, touristique
        default:
          break;
      }

      // Étape 6 : Récupérer le lieu mis à jour pour la réponse
      const relationMap = {
        loisirs: { loisirs: true },
        hotels: { hotels: true },
        parcs: { parcsJardins: true },
        marches: { marches: true },
        sites: { sitesNaturels: true },
        zones: { zonesProtegees: true },
        supermarches: { supermarchesEtablissement: true },
        touristique: { etablissementTouristique: true }
      };

      const updatedLieu = await tx.lieu.findUnique({
        where: { id: BigInt(id) },
        include: {
          images: true,
          likes: true,
          favorites: true,
          ...relationMap[lieuType.type]
        }
      });

      // Étape 7 : Récupérer la géométrie mise à jour
      const [geometryResult] = await tx.$queryRaw`
        SELECT ST_AsEWKT(geometry) AS geometry FROM "Lieu" WHERE id = ${BigInt(id)};
      `;

      // Étape 8 : Convertir les BigInt et les Date en formats sérialisables
      const convertToSerializable = (obj) => {
        if (!obj) return obj;
        const newObj = { ...obj };
        if (newObj.id && typeof newObj.id === 'bigint') {
          newObj.id = newObj.id.toString();
        }
        if (newObj.createdAt instanceof Date) {
          newObj.createdAt = newObj.createdAt.toISOString();
        }
        if (newObj.updatedAt instanceof Date) {
          newObj.updatedAt = newObj.updatedAt.toISOString();
        }
        for (const key in newObj) {
          if (Array.isArray(newObj[key])) {
            newObj[key] = newObj[key].map(convertToSerializable);
          } else if (typeof newObj[key] === 'object' && newObj[key] !== null) {
            newObj[key] = convertToSerializable(newObj[key]);
          }
        }
        return newObj;
      };

      const convertedLieu = convertToSerializable(updatedLieu);

      // Étape 9 : Filtrer les champs pertinents pour la réponse
      const filteredResponse = {};
      pertinentFields.forEach(field => {
        if (convertedLieu[field] !== undefined) {
          filteredResponse[field] = convertedLieu[field];
        }
      });

      filteredResponse.createdAt = convertedLieu.createdAt;
      filteredResponse.updatedAt = convertedLieu.updatedAt;
      filteredResponse.geometry = geometryResult?.geometry || null;

      const relationKey = lieuType.type === 'loisirs' ? 'loisirs' :
                         lieuType.type === 'hotels' ? 'hotels' :
                         lieuType.type === 'parcs' ? 'parcsJardins' :
                         lieuType.type === 'marches' ? 'marches' :
                         lieuType.type === 'sites' ? 'sitesNaturels' :
                         lieuType.type === 'zones' ? 'zonesProtegees' :
                         lieuType.type === 'supermarches' ? 'supermarchesEtablissement' :
                         'etablissementTouristique';

      filteredResponse[relationKey] = convertedLieu[relationKey];
      filteredResponse.images = convertedLieu.images;
      filteredResponse.likes = convertedLieu.likes;
      filteredResponse.favorites = convertedLieu.favorites;

      return filteredResponse;
    });

    return {
      success: true,
      data: result,
      message: `Lieu de type ${lieuType.type} mis à jour avec succès`
    };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du lieu:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

  /**
   * Désactiver un lieu
   */
  async desactivateLieu(id) {
    try {
      const lieu = await prisma.lieu.update({
        where: { id: BigInt(id) },
        data: { status: false }
      });

      return {
        success: true,
        data: {
          ...lieu,
          id: lieu.id.toString()
        },
        message: 'Lieu désactivé avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la désactivation du lieu:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Supprimer un lieu (suppression en cascade automatique)
   */
  async deleteLieu(id) {
    try {
      await prisma.lieu.delete({
        where: { id: BigInt(id) }
      });

      return {
        success: true,
        message: 'Lieu supprimé avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la suppression du lieu:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Valider le type de lieu
   */
  isValidType(type) {
    const validTypes = ['loisirs', 'hotels', 'parcs', 'marches', 'sites', 'zones', 'supermarches', 'touristique'];
    return validTypes.includes(type);
  }

  /**
   * Préparer les données spécifiques selon le type
   */
  prepareSpecificData(type, data) {
    switch (type) {
      case 'loisirs':
        return { etablissementType: data.etablissementType || data.etablissement_type };
      case 'parcs':
        return { terrain: data.terrain };
      case 'marches':
        return { organisme: data.organisme };
      case 'sites':
        return {
          typeSiteDeux: data.typeSiteDeux,
          ministereTutelle: data.ministereTutelle,
          religion: data.religion
        };
      default:
        return {};
    }
  }
}

module.exports = new LieuService();