const express = require('express');
// Crée une instance de Router pour définir les routes de l'API
const router = express.Router();
// Importe la connexion à la base de données
const db = require('../libraries/Database');
// Importe les schémas de validation Zod pour les entités Lieu et Réservation
const { 
  lieuSchema, 
  reservationSchema,
  loisirsSchema,
  hotelsSchema,
  parcsSchema,
  marchesSchema,
  sitesSchema,
  zonesSchema,
  supermarchesSchema,
  touristiqueSchema
} = require('../schemas/apiShema');

const z = require('zod');

// Route pour créer un nouveau lieu (avec support automatique pour tous les types)
router.post('/lieux', async (req, res) => {
  try {
    // Validation des données avec Zod
    const data = lieuSchema.parse(req.body);

    // Construction de la liste des valeurs avec leurs positions
    const values = [
      data.etab_images || null,
      data.region_nom,
      data.prefecture_nom || null,
      data.commune_nom || null,
      data.canton_nom || null,
      data.nom_localite || null,
      data.etab_nom,
      data.etab_jour ? `{${data.etab_jour.join(',')}}` : null,
      data.toilette_type || null,
      data.etab_adresse || null,
      data.type,
      data.description || null,
      data.activite_statut || null,
      data.activite_categorie || null,
      data.etab_creation_date || null,
      data.geometry,
      data.status
    ].filter(v => v !== undefined);

    // Insertion du lieu dans la base de données
    const result = await db.query(
      `INSERT INTO "Lieu" (
        etab_images, region_nom, prefecture_nom, commune_nom, canton_nom, 
        nom_localite, etab_nom, etab_jour, toilette_type, etab_adresse, 
        type, description, activite_statut, activite_categorie, 
        etab_creation_date, geometry, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, ST_GeomFromText($16), $17)
       RETURNING id, region_nom, prefecture_nom, commune_nom, canton_nom, etab_nom, type`,
      values
    );

    // Création automatique d'un enregistrement dans la table spécifique selon le type
    const typeSchemas = {
      'loisirs': loisirsSchema,
      'hotels': hotelsSchema,
      'parcs': parcsSchema,
      'marches': marchesSchema,
      'sites': sitesSchema,
      'zones': zonesSchema,
      'supermarches': supermarchesSchema,
      'touristique': touristiqueSchema
    };

    const typeTable = {
      'loisirs': 'Loisirs',
      'hotels': 'Hotels',
      'parcs': 'Parcs_Jardins',
      'marches': 'Marches',
      'sites': 'Sites_Naturels',
      'zones': 'Zones_Protegees',
      'supermarches': 'Supermarches_Etablissement',
      'touristique': 'Etablissement_Touristique'
    };

    const type = data.type.toLowerCase();
    if (typeSchemas[type]) {
      // Pour les types sans champs spécifiques, on insère uniquement l'id
      if (Object.keys(typeSchemas[type].shape).length === 0) {
        await db.query(
          `INSERT INTO "${typeTable[type]}" (id) VALUES ($1)`,
          [result.rows[0].id]
        );
      } else {
        // Pour les types avec champs spécifiques
        const specificData = typeSchemas[type].parse(req.body);
        const fields = Object.keys(specificData).filter(field => specificData[field] !== undefined);
        const values = fields.map(field => specificData[field]);

        if (fields.length > 0) {
          const setQuery = fields.map((field, idx) => `"${field}" = $${idx + 1}`).join(', ');
          await db.query(
            `INSERT INTO "${typeTable[type]}" (id, ${fields.join(', ')}) VALUES ($${fields.length + 1}, ${fields.map((_, idx) => `$${idx + 1}`).join(', ')})`,
            [...values, result.rows[0].id]
          );
        } else {
          // Si aucun champ spécifique n'est fourni, on insère uniquement l'id
          await db.query(
            `INSERT INTO "${typeTable[type]}" (id) VALUES ($1)`,
            [result.rows[0].id]
          );
        }
      }
    }

    return res.status(201).json({
      status: 'Succès',
      message: 'Lieu créé avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    // Gestion des erreurs de validation
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }
    
    console.error(err);
    return res.status(400).json({
      status: 'Erreur',
      message: 'Erreur lors de la création du lieu',
      statusCode: 400,
    });
  }
});

// Route GET pour récupérer les informations d'un utilisateur spécifique par son ID
router.get('/users/:id', async (req, res) => {
  // Route GET pour récupérer les informations d'un utilisateur spécifique par son ID
  const { id } = req.params; // Récupère l'ID de l'utilisateur depuis les paramètres de la requête
  const userId = req.userId; // Récupère l'ID de l'utilisateur connecté (via middleware d'authentification)

  try {
    // Requête SQL pour sélectionner les détails de l'utilisateur avec l'ID spécifié, uniquement s'il est actif
    const record = await db.query(
      `SELECT id, name, firstname, email, role
       FROM "User"  -- Utilisation de guillemets pour respecter le nom de table PostgreSQL
       WHERE id = $1 AND active = true`,
      [id]
    );

    // Vérifie si un utilisateur a été trouvé
    if (record.rowCount > 0) {
      return res.status(200).json({
        status: 'Succès',
        message: 'Utilisateur récupéré avec succès',
        data: record.rows[0], // Retourne les données de l'utilisateur trouvé
      });
    } else {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Utilisateur non trouvé',
        statusCode: 404,
      });
    }
  } catch (err) {
    // Gestion des erreurs inattendues (par exemple, problème de connexion à la base de données)
    console.error(err);
    return res.status(400).json({
      status: 'Erreur',
      message: 'Erreur client',
      statusCode: 400,
    });
  }
});

// Route pour mettre à jour un loisir existant
router.put('/loisirs/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  // Validation de l'ID
  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de loisir invalide',
      statusCode: 400,
    });
  }

  try {
    // Schémas de validation pour les deux tables
    const lieuSchema = z.object({
      etab_images: z.array(z.string()).optional(),
      region_nom: z.string().optional(),
      prefecture_nom: z.string().optional(),
      commune_nom: z.string().optional(),
      canton_nom: z.string().optional(),
      nom_localite: z.string().optional(),
      etab_nom: z.string().optional(),
      etab_adresse: z.string().optional(),
      etab_jour: z.union([z.array(z.string()), z.string()]).optional(),
      geometry: z.string().optional(),
      status: z.union([
        z.boolean(),
        z.string().transform(v => v.toLowerCase() === 'true')
      ]).optional()
    });

    const loisirsSchema = z.object({
      etablissement_type: z.string().optional()
    });

    // Validation et séparation des données
    const lieuData = lieuSchema.parse(req.body);
    const loisirsData = loisirsSchema.parse(req.body);

    // Vérification qu'au moins un champ est fourni
    if (Object.keys(lieuData).length === 0 && Object.keys(loisirsData).length === 0) {
      return res.status(400).json({
        status: 'Erreur',
        message: 'Aucun champ à mettre à jour',
        statusCode: 400,
      });
    }

    // Début de la transaction pour assurer la cohérence
    await db.query('BEGIN');

    let lieuUpdated = null;
    let loisirsUpdated = null;

    // Mise à jour de la table Lieu si nécessaire
    if (Object.keys(lieuData).length > 0) {
      const fields = Object.keys(lieuData);
      const values = Object.values(lieuData);

      // Construction dynamique de la requête UPDATE
      const setQuery = fields.map((field, idx) => {
        if (field === 'etab_jour') {
          return `"${field}" = $${idx + 1}::text[]`;
        }
        if (field === 'geometry') {
          return `"${field}" = ST_GeomFromText($${idx + 1})`;
        }
        return `"${field}" = $${idx + 1}`;
      }).join(', ');

      const sql = `
        UPDATE "Lieu"
        SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${fields.length + 1}
        RETURNING *;
      `;

      const result = await db.query(sql, [...values, lieuId]);
      lieuUpdated = result.rows[0];
    }

    // Mise à jour de la table Loisirs si nécessaire
    if (Object.keys(loisirsData).length > 0) {
      const fields = Object.keys(loisirsData);
      const values = Object.values(loisirsData);

      const setQuery = fields.map((field, idx) => `"${field}" = $${idx + 1}`).join(', ');

      const sql = `
        UPDATE "Loisirs"
        SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${fields.length + 1}
        RETURNING *;
      `;

      const result = await db.query(sql, [...values, lieuId]);
      loisirsUpdated = result.rows[0];
    }

    // Validation de la transaction
    await db.query('COMMIT');

    return res.status(200).json({
      status: 'Succès',
      message: 'Loisir mis à jour avec succès',
      data: {
        lieu: lieuUpdated,
        loisirs: loisirsUpdated
      }
    });

  } catch (err) {
    // Annulation de la transaction en cas d'erreur
    await db.query('ROLLBACK');

    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la mise à jour',
      statusCode: 500,
    });
  }
});

// Route pour récupérer un loisir avec toutes ses informations
router.get('/loisirs/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);
  
  // Validation de l'ID
  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de loisir invalide',
      statusCode: 400,
    });
  }

  try {
    // Récupération des données complètes du loisir (Lieu + Loisirs)
    const result = await db.query(
      `SELECT l.*, lo.etablissement_type
       FROM "Lieu" l
       JOIN "Loisirs" lo ON l.id = lo.id
       WHERE l.id = $1 AND l.status = TRUE`,
      [lieuId]
    );

    // Vérification de l'existence du loisir
    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Loisir non trouvé ou inactif',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Loisir récupéré avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération du loisir',
      statusCode: 500,
    });
  }
});

// Route pour supprimer un lieu (avec gestion automatique des loisirs liés)
router.delete('/lieu/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  // Validation de l'ID
  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de lieu invalide',
      statusCode: 400,
    });
  }

  try {
    // Début de la transaction pour assurer la cohérence des suppressions
    await db.query('BEGIN');

    // Vérification de l'existence du lieu avant suppression
    const checkResult = await db.query(
      `SELECT id, type, etab_nom FROM "Lieu" WHERE id = $1`,
      [lieuId]
    );

    if (checkResult.rowCount === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({
        status: 'Erreur',
        message: 'Lieu non trouvé',
        statusCode: 404,
      });
    }

    const lieu = checkResult.rows[0];

    // Suppression des données liées dans l'ordre des contraintes FK
    // 1. Suppression des loisirs si c'est un lieu de type "loisirs"
    if (lieu.type === 'loisirs') {
      await db.query(`DELETE FROM "Loisirs" WHERE id = $1`, [lieuId]);
    }

    // 2. Suppression des réservations liées
    await db.query(`DELETE FROM "Reservations" WHERE lieu_id = $1`, [lieuId]);

    // 3. Suppression des autres tables liées (menus, favoris, etc.)
    await db.query(`DELETE FROM "Menu" WHERE loisir_id = $1`, [lieuId]);
    await db.query(`DELETE FROM "Favorites" WHERE lieu_id = $1`, [lieuId]);
    await db.query(`DELETE FROM "Likes" WHERE lieu_id = $1`, [lieuId]);
    await db.query(`DELETE FROM "Images" WHERE lieu_id = $1`, [lieuId]);

    // 4. Suppression du lieu principal
    const deleteResult = await db.query(
      `DELETE FROM "Lieu" WHERE id = $1 RETURNING id, etab_nom`,
      [lieuId]
    );

    // Validation de la transaction
    await db.query('COMMIT');

    return res.status(200).json({
      status: 'Succès',
      message: `Lieu "${lieu.etab_nom}" supprimé avec succès`,
      data: {
        id: deleteResult.rows[0].id,
        nom: deleteResult.rows[0].etab_nom,
        supprime_le: new Date().toISOString()
      }
    });

  } catch (err) {
    // Annulation de la transaction en cas d'erreur
    await db.query('ROLLBACK');
    
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la suppression du lieu',
      statusCode: 500,
    });
  }
});

// Route pour suppression douce (désactivation) d'un lieu
router.patch('/lieu/:id/desactivate', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  // Validation de l'ID
  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de lieu invalide',
      statusCode: 400,
    });
  }

  try {
    // Désactivation du lieu (suppression douce)
    const result = await db.query(
      `UPDATE "Lieu" 
       SET status = FALSE, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND status = TRUE
       RETURNING id, etab_nom, status`,
      [lieuId]
    );

    // Vérification que le lieu existait et était actif
    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Lieu non trouvé ou déjà désactivé',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Lieu désactivé avec succès',
      data: {
        id: result.rows[0].id,
        nom: result.rows[0].etab_nom,
        status: result.rows[0].status,
        desactive_le: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la désactivation du lieu',
      statusCode: 500,
    });
  }
});

// Route pour créer une nouvelle réservation
router.post('/reservations', async (req, res) => {
  const userId = req.userId; // Assumer que l'utilisateur est authentifié via middleware

  if (!userId) {
    return res.status(401).json({
      status: 'Erreur',
      message: 'Utilisateur non authentifié',
      statusCode: 401,
    });
  }

  try {
    // Validation des données avec Zod
    const data = reservationSchema.parse(req.body);

    // Vérification que le lieu existe et est actif
    const lieuCheck = await db.query(
      `SELECT id FROM "Lieu" WHERE id = $1 AND status = TRUE`,
      [data.lieu_id]
    );

    if (lieuCheck.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Lieu non trouvé ou inactif',
        statusCode: 404,
      });
    }

    // Insertion de la réservation dans la base de données
    const result = await db.query(
      `INSERT INTO "Reservations" (
        status, date_reservation, heure_reservation, nb_place, 
        user_contact, user_id, lieu_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_reservation, status, date_reservation, heure_reservation, nb_place`,
      [
        data.status || 'en_attente',
        data.date_reservation,
        data.heure_reservation,
        data.nb_place,
        data.user_contact || null,
        userId,
        data.lieu_id,
      ]
    );

    return res.status(201).json({
      status: 'Succès',
      message: 'Réservation créée avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    // Gestion des erreurs de validation
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }
    
    console.error(err);
    return res.status(400).json({
      status: 'Erreur',
      message: 'Erreur lors de la création de la réservation',
      statusCode: 400,
    });
  }
});

// Route pour récupérer une réservation spécifique par ID
router.get('/reservations/:id', async (req, res) => {
  const { id } = req.params;
  const reservationId = parseInt(id, 10);
  const userId = req.userId; // Utilisateur authentifié

  if (isNaN(reservationId) || reservationId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de réservation invalide',
      statusCode: 400,
    });
  }

  try {
    // Récupération de la réservation (seulement si elle appartient à l'utilisateur connecté ou si admin)
    const result = await db.query(
      `SELECT r.*, l.etab_nom AS lieu_nom
       FROM "Reservations" r
       JOIN "Lieu" l ON r.lieu_id = l.id
       WHERE r.id_reservation = $1 AND r.user_id = $2`,
      [reservationId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Réservation non trouvée',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Réservation récupérée avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération de la réservation',
      statusCode: 500,
    });
  }
});

// Route pour mettre à jour une réservation (par exemple, changer le statut)
router.put('/reservations/:id', async (req, res) => {
  const { id } = req.params;
  const reservationId = parseInt(id, 10);
  const userId = req.userId;

  if (isNaN(reservationId) || reservationId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de réservation invalide',
      statusCode: 400,
    });
  }

  try {
    // Schéma de validation partiel pour la mise à jour
    const updateSchema = reservationSchema.partial(); // Permet des mises à jour partielles
    const data = updateSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        status: 'Erreur',
        message: 'Aucun champ à mettre à jour',
        statusCode: 400,
      });
    }

    // Vérification que la réservation appartient à l'utilisateur
    const check = await db.query(
      `SELECT id_reservation FROM "Reservations" WHERE id_reservation = $1 AND user_id = $2`,
      [reservationId, userId]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Réservation non trouvée',
        statusCode: 404,
      });
    }

    // Construction dynamique de la requête UPDATE
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setQuery = fields.map((field, idx) => `"${field}" = $${idx + 1}`).join(', ');

    const sql = `
      UPDATE "Reservations"
      SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
      WHERE id_reservation = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await db.query(sql, [...values, reservationId]);

    return res.status(200).json({
      status: 'Succès',
      message: 'Réservation mise à jour avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la mise à jour de la réservation',
      statusCode: 500,
    });
  }
});

// Route pour annuler (supprimer) une réservation
router.delete('/reservations/:id', async (req, res) => {
  const { id } = req.params;
  const reservationId = parseInt(id, 10);
  const userId = req.userId;

  if (isNaN(reservationId) || reservationId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de réservation invalide',
      statusCode: 400,
    });
  }

  try {
    // Vérification que la réservation appartient à l'utilisateur
    const check = await db.query(
      `SELECT id_reservation FROM "Reservations" WHERE id_reservation = $1 AND user_id = $2`,
      [reservationId, userId]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Réservation non trouvée',
        statusCode: 404,
      });
    }

    // Suppression de la réservation
    const result = await db.query(
      `DELETE FROM "Reservations" WHERE id_reservation = $1 RETURNING id_reservation`,
      [reservationId]
    );

    return res.status(200).json({
      status: 'Succès',
      message: 'Réservation annulée avec succès',
      data: {
        id_reservation: result.rows[0].id_reservation,
        annulee_le: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de l\'annulation de la réservation',
      statusCode: 500,
    });
  }
});

// Route pour lister toutes les réservations d'un utilisateur
router.get('/users/:userId/reservations', async (req, res) => {
  const { userId } = req.params;
  const authenticatedUserId = req.userId;

  // Vérifier que l'utilisateur demande ses propres réservations (ou admin)
  if (parseInt(userId, 10) !== authenticatedUserId) {
    return res.status(403).json({
      status: 'Erreur',
      message: 'Accès interdit',
      statusCode: 403,
    });
  }

  try {
    const result = await db.query(
      `SELECT r.*, l.etab_nom AS lieu_nom
       FROM "Reservations" r
       JOIN "Lieu" l ON r.lieu_id = l.id
       WHERE r.user_id = $1
       ORDER BY r.date_reservation DESC, r.heure_reservation DESC`,
      [userId]
    );

    return res.status(200).json({
      status: 'Succès',
      message: 'Réservations récupérées avec succès',
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération des réservations',
      statusCode: 500,
    });
  }
});

// Route pour créer un nouveau menu pour un loisir
router.post('/loisirs/:id/menus', async (req, res) => {
  const { id } = req.params;
  const loisirId = parseInt(id, 10);

  if (isNaN(loisirId) || loisirId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de loisir invalide',
      statusCode: 400,
    });
  }

  try {
    // Schéma de validation pour le menu (à définir dans apiShema si nécessaire)
    const menuSchema = z.object({
      id_Menu: z.string().uuid(), // UUID généré côté client ou serveur
      nom_Menu: z.string(),
      Description: z.string().optional(),
    });

    const data = menuSchema.parse(req.body);

    // Vérification que le loisir existe
    const check = await db.query(
      `SELECT id FROM "Loisirs" WHERE id = $1`,
      [loisirId]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Loisir non trouvé',
        statusCode: 404,
      });
    }

    // Insertion du menu
    const result = await db.query(
      `INSERT INTO "Menu" (id_Menu, nom_Menu, Description, loisir_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id_Menu, nom_Menu, Description`,
      [data.id_Menu, data.nom_Menu, data.Description || null, loisirId]
    );

    return res.status(201).json({
      status: 'Succès',
      message: 'Menu créé avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(400).json({
      status: 'Erreur',
      message: 'Erreur lors de la création du menu',
      statusCode: 400,
    });
  }
});

// Route pour récupérer les menus d'un loisir
router.get('/loisirs/:id/menus', async (req, res) => {
  const { id } = req.params;
  const loisirId = parseInt(id, 10);

  if (isNaN(loisirId) || loisirId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de loisir invalide',
      statusCode: 400,
    });
  }

  try {
    const result = await db.query(
      `SELECT * FROM "Menu" WHERE loisir_id = $1`,
      [loisirId]
    );

    return res.status(200).json({
      status: 'Succès',
      message: 'Menus récupérés avec succès',
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération des menus',
      statusCode: 500,
    });
  }
});

// Route pour créer une catégorie de plat pour un menu
router.post('/menus/:menuId/categories', async (req, res) => {
  const { menuId } = req.params;

  try {
    // Schéma de validation pour la catégorie
    const categorieSchema = z.object({
      idCategorie: z.string().uuid(),
      nom_Categorie: z.string(),
      description: z.string().optional(),
    });

    const data = categorieSchema.parse(req.body);

    // Vérification que le menu existe
    const check = await db.query(
      `SELECT id_Menu FROM "Menu" WHERE id_Menu = $1`,
      [menuId]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Menu non trouvé',
        statusCode: 404,
      });
    }

    // Insertion de la catégorie
    const result = await db.query(
      `INSERT INTO "CategoriePlat" (idCategorie, nom_Categorie, description, id_Menu)
       VALUES ($1, $2, $3, $4)
       RETURNING idCategorie, nom_Categorie, description`,
      [data.idCategorie, data.nom_Categorie, data.description || null, menuId]
    );

    return res.status(201).json({
      status: 'Succès',
      message: 'Catégorie de plat créée avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(400).json({
      status: 'Erreur',
      message: 'Erreur lors de la création de la catégorie',
      statusCode: 400,
    });
  }
});

// Route pour créer un plat dans une catégorie
router.post('/categories/:categorieId/plats', async (req, res) => {
  const { categorieId } = req.params;

  try {
    // Schéma de validation pour le plat
    const platSchema = z.object({
      nom_plat: z.string(),
      description: z.string().optional(),
      prix: z.number().positive(),
      disponible: z.boolean().optional(),
    });

    const data = platSchema.parse(req.body);

    // Vérification que la catégorie existe
    const check = await db.query(
      `SELECT idCategorie FROM "CategoriePlat" WHERE idCategorie = $1`,
      [categorieId]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Catégorie non trouvée',
        statusCode: 404,
      });
    }

    // Insertion du plat
    const result = await db.query(
      `INSERT INTO "Plat" (nom_plat, description, prix, disponible, idCategorie)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_plat, nom_plat, description, prix, disponible`,
      [data.nom_plat, data.description || null, data.prix, data.disponible ?? true, categorieId]
    );

    return res.status(201).json({
      status: 'Succès',
      message: 'Plat créé avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(400).json({
      status: 'Erreur',
      message: 'Erreur lors de la création du plat',
      statusCode: 400,
    });
  }
});

// Route pour ajouter un like à un lieu
router.post('/lieux/:id/likes', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);
  const userId = req.userId;

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de lieu invalide',
      statusCode: 400,
    });
  }

  if (!userId) {
    return res.status(401).json({
      status: 'Erreur',
      message: 'Utilisateur non authentifié',
      statusCode: 401,
    });
  }

  try {
    // Vérification si le like existe déjà
    const check = await db.query(
      `SELECT id_like FROM "Likes" WHERE user_id = $1 AND lieu_id = $2`,
      [userId, lieuId]
    );

    if (check.rowCount > 0) {
      return res.status(409).json({
        status: 'Erreur',
        message: 'Like déjà ajouté',
        statusCode: 409,
      });
    }

    // Insertion du like
    const result = await db.query(
      `INSERT INTO "Likes" (user_id, lieu_id)
       VALUES ($1, $2)
       RETURNING id_like`,
      [userId, lieuId]
    );

    return res.status(201).json({
      status: 'Succès',
      message: 'Like ajouté avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de l\'ajout du like',
      statusCode: 500,
    });
  }
});

// Route pour supprimer un like
router.delete('/lieux/:id/likes', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);
  const userId = req.userId;

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de lieu invalide',
      statusCode: 400,
    });
  }

  try {
    const result = await db.query(
      `DELETE FROM "Likes" WHERE user_id = $1 AND lieu_id = $2 RETURNING id_like`,
      [userId, lieuId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Like non trouvé',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Like supprimé avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la suppression du like',
      statusCode: 500,
    });
  }
});

// Route pour ajouter un lieu aux favoris
router.post('/lieux/:id/favorites', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);
  const userId = req.userId;

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de lieu invalide',
      statusCode: 400,
    });
  }

  if (!userId) {
    return res.status(401).json({
      status: 'Erreur',
      message: 'Utilisateur non authentifié',
      statusCode: 401,
    });
  }

  try {
    // Vérification si déjà en favoris
    const check = await db.query(
      `SELECT id_favorite FROM "Favorites" WHERE user_id = $1 AND lieu_id = $2`,
      [userId, lieuId]
    );

    if (check.rowCount > 0) {
      return res.status(409).json({
        status: 'Erreur',
        message: 'Déjà en favoris',
        statusCode: 409,
      });
    }

    // Insertion en favoris
    const result = await db.query(
      `INSERT INTO "Favorites" (user_id, lieu_id)
       VALUES ($1, $2)
       RETURNING id_favorite`,
      [userId, lieuId]
    );

    return res.status(201).json({
      status: 'Succès',
      message: 'Ajouté aux favoris avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de l\'ajout aux favoris',
      statusCode: 500,
    });
  }
});

// Route pour supprimer un lieu des favoris
router.delete('/lieux/:id/favorites', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);
  const userId = req.userId;

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de lieu invalide',
      statusCode: 400,
    });
  }

  try {
    const result = await db.query(
      `DELETE FROM "Favorites" WHERE user_id = $1 AND lieu_id = $2 RETURNING id_favorite`,
      [userId, lieuId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Favori non trouvé',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Supprimé des favoris avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la suppression des favoris',
      statusCode: 500,
    });
  }
});

// Route pour lister les favoris d'un utilisateur
router.get('/users/:userId/favorites', async (req, res) => {
  const { userId } = req.params;
  const authenticatedUserId = req.userId;

  if (parseInt(userId, 10) !== authenticatedUserId) {
    return res.status(403).json({
      status: 'Erreur',
      message: 'Accès interdit',
      statusCode: 403,
    });
  }

  try {
    const result = await db.query(
      `SELECT f.*, l.etab_nom AS lieu_nom, l.type AS lieu_type
       FROM "Favorites" f
       JOIN "Lieu" l ON f.lieu_id = l.id
       WHERE f.user_id = $1 AND l.status = TRUE`,
      [userId]
    );

    return res.status(200).json({
      status: 'Succès',
      message: 'Favoris récupérés avec succès',
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération des favoris',
      statusCode: 500,
    });
  }
});

// Route pour créer une notification
router.post('/notifications', async (req, res) => {
  const userId = req.userId; // Utilisateur authentifié via middleware

  if (!userId) {
    return res.status(401).json({
      status: 'Erreur',
      message: 'Utilisateur non authentifié',
      statusCode: 401,
    });
  }

  try {
    // Schéma de validation pour la notification
    const notificationSchema = z.object({
      message: z.string().min(1, 'Le message est requis'),
      typeNotification: z.string().min(1, 'Le type de notification est requis'),
      user_id: z.number().int().positive().optional(), // Optionnel, car peut être défini par l'API
    });

    const data = notificationSchema.parse(req.body);

    // Vérification que l'utilisateur cible existe
    const targetUserId = data.user_id || userId;
    const userCheck = await db.query(
      `SELECT id FROM "User" WHERE id = $1 AND active = TRUE`,
      [targetUserId]
    );

    if (userCheck.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Utilisateur cible non trouvé ou inactif',
        statusCode: 404,
      });
    }

    // Insertion de la notification
    const result = await db.query(
      `INSERT INTO "Notifications" (message, typeNotification, user_id)
       VALUES ($1, $2, $3)
       RETURNING id_notification, message, typeNotification, is_read, created_at`,
      [data.message, data.typeNotification, targetUserId]
    );

    return res.status(201).json({
      status: 'Succès',
      message: 'Notification créée avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la création de la notification',
      statusCode: 500,
    });
  }
});

// Route pour marquer une notification comme lue
router.patch('/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  const notificationId = parseInt(id, 10);
  const userId = req.userId;

  if (isNaN(notificationId) || notificationId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de notification invalide',
      statusCode: 400,
    });
  }

  try {
    // Vérification que la notification appartient à l'utilisateur
    const check = await db.query(
      `SELECT id_notification FROM "Notifications" WHERE id_notification = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Notification non trouvée',
        statusCode: 404,
      });
    }

    // Mise à jour du statut de lecture
    const result = await db.query(
      `UPDATE "Notifications" 
       SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP 
       WHERE id_notification = $1
       RETURNING id_notification, message, typeNotification, is_read`,
      [notificationId]
    );

    return res.status(200).json({
      status: 'Succès',
      message: 'Notification marquée comme lue',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la mise à jour de la notification',
      statusCode: 500,
    });
  }
});

// Route pour récupérer les notifications d'un utilisateur
router.get('/users/:userId/notifications', async (req, res) => {
  const { userId } = req.params;
  const authenticatedUserId = req.userId;

  if (parseInt(userId, 10) !== authenticatedUserId) {
    return res.status(403).json({
      status: 'Erreur',
      message: 'Accès interdit',
      statusCode: 403,
    });
  }

  try {
    const result = await db.query(
      `SELECT id_notification, message, typeNotification, is_read, created_at
       FROM "Notifications"
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      status: 'Succès',
      message: 'Notifications récupérées avec succès',
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération des notifications',
      statusCode: 500,
    });
  }
});

// Route pour ajouter une image à un lieu
router.post('/lieux/:id/images', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);
  const userId = req.userId;

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de lieu invalide',
      statusCode: 400,
    });
  }

  if (!userId) {
    return res.status(401).json({
      status: 'Erreur',
      message: 'Utilisateur non authentifié',
      statusCode: 401,
    });
  }

  try {
    // Schéma de validation pour l'image
    const imageSchema = z.object({
      image_url: z.string().url('URL de l\'image invalide'),
    });

    const data = imageSchema.parse(req.body);

    // Vérification que le lieu existe et est actif
    const lieuCheck = await db.query(
      `SELECT id FROM "Lieu" WHERE id = $1 AND status = TRUE`,
      [lieuId]
    );

    if (lieuCheck.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Lieu non trouvé ou inactif',
        statusCode: 404,
      });
    }

    // Insertion de l'image
    const result = await db.query(
      `INSERT INTO "Images" (lieu_id, image_url)
       VALUES ($1, $2)
       RETURNING id_image, image_url, created_at`,
      [lieuId, data.image_url]
    );

    return res.status(201).json({
      status: 'Succès',
      message: 'Image ajoutée avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de l\'ajout de l\'image',
      statusCode: 500,
    });
  }
});

// Route pour récupérer les images d'un lieu
router.get('/lieux/:id/images', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de lieu invalide',
      statusCode: 400,
    });
  }

  try {
    const result = await db.query(
      `SELECT id_image, image_url, created_at
       FROM "Images"
       WHERE lieu_id = $1
       ORDER BY created_at DESC`,
      [lieuId]
    );

    return res.status(200).json({
      status: 'Succès',
      message: 'Images récupérées avec succès',
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération des images',
      statusCode: 500,
    });
  }
});

// Route pour supprimer une image
router.delete('/images/:id', async (req, res) => {
  const { id } = req.params;
  const imageId = parseInt(id, 10);
  const userId = req.userId;

  if (isNaN(imageId) || imageId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID d\'image invalide',
      statusCode: 400,
    });
  }

  try {
    // Vérification que l'image existe
    const check = await db.query(
      `SELECT i.id_image, l.id AS lieu_id
       FROM "Images" i
       JOIN "Lieu" l ON i.lieu_id = l.id
       WHERE i.id_image = $1`,
      [imageId]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Image non trouvée',
        statusCode: 404,
      });
    }

    // Suppression de l'image
    const result = await db.query(
      `DELETE FROM "Images" WHERE id_image = $1 RETURNING id_image`,
      [imageId]
    );

    return res.status(200).json({
      status: 'Succès',
      message: 'Image supprimée avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la suppression de l\'image',
      statusCode: 500,
    });
  }
});

// Route pour récupérer tous les plats d'une catégorie
router.get('/categories/:categorieId/plats', async (req, res) => {
  const { categorieId } = req.params;

  try {
    // Vérification que la catégorie existe
    const check = await db.query(
      `SELECT idCategorie FROM "CategoriePlat" WHERE idCategorie = $1`,
      [categorieId]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Catégorie non trouvée',
        statusCode: 404,
      });
    }

    // Récupération des plats
    const result = await db.query(
      `SELECT id_plat, nom_plat, description, prix, disponible, created_at
       FROM "Plat"
       WHERE idCategorie = $1
       ORDER BY created_at DESC`,
      [categorieId]
    );

    return res.status(200).json({
      status: 'Succès',
      message: 'Plats récupérés avec succès',
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération des plats',
      statusCode: 500,
    });
  }
});

// Route pour mettre à jour un plat
router.put('/plats/:id', async (req, res) => {
  const { id } = req.params;
  const platId = parseInt(id, 10);

  if (isNaN(platId) || platId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de plat invalide',
      statusCode: 400,
    });
  }

  try {
    // Schéma de validation partiel pour la mise à jour
    const platSchema = z.object({
      nom_plat: z.string().optional(),
      description: z.string().optional(),
      prix: z.number().positive().optional(),
      disponible: z.boolean().optional(),
    });

    const data = platSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        status: 'Erreur',
        message: 'Aucun champ à mettre à jour',
        statusCode: 400,
      });
    }

    // Construction dynamique de la requête UPDATE
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setQuery = fields.map((field, idx) => `"${field}" = $${idx + 1}`).join(', ');

    const sql = `
      UPDATE "Plat"
      SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
      WHERE id_plat = $${fields.length + 1}
      RETURNING id_plat, nom_plat, description, prix, disponible`;
    
    const result = await db.query(sql, [...values, platId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Plat non trouvé',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Plat mis à jour avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la mise à jour du plat',
      statusCode: 500,
    });
  }
});

// Route pour supprimer un plat
router.delete('/plats/:id', async (req, res) => {
  const { id } = req.params;
  const platId = parseInt(id, 10);

  if (isNaN(platId) || platId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de plat invalide',
      statusCode: 400,
    });
  }

  try {
    const result = await db.query(
      `DELETE FROM "Plat" WHERE id_plat = $1 RETURNING id_plat`,
      [platId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Plat non trouvé',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Plat supprimé avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la suppression du plat',
      statusCode: 500,
    });
  }
});

// Route pour récupérer un hôtel avec toutes ses informations
router.get('/hotels/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID d\'hôtel invalide',
      statusCode: 400,
    });
  }

  try {
    const result = await db.query(
      `SELECT l.*, h.*
       FROM "Lieu" l
       JOIN "Hotels" h ON l.id = h.id
       WHERE l.id = $1 AND l.status = TRUE`,
      [lieuId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Hôtel non trouvé ou inactif',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération de l\'hôtel',
      statusCode: 500,
    });
  }
});

// Route pour mettre à jour un hôtel existant
router.put('/hotels/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID d\'hôtel invalide',
      statusCode: 400,
    });
  }

  try {
    // Schémas de validation pour les deux tables
    const lieuSchema = z.object({
      etab_images: z.array(z.string()).optional(),
      region_nom: z.string().optional(),
      prefecture_nom: z.string().optional(),
      commune_nom: z.string().optional(),
      canton_nom: z.string().optional(),
      etab_nom: z.string().optional(),
      toilette_type: z.string().optional(),
      description: z.string().optional(),
      geometry: z.string().optional(),
      status: z.union([
        z.boolean(),
        z.string().transform(v => v.toLowerCase() === 'true')
      ]).optional(),

    });

    const hotelsSchema = z.object({
      toilette_type: z.string().optional()
    });

    // Validation et séparation des données
    const lieuData = lieuSchema.parse(req.body);
    const hotelsData = hotelsSchema.parse(req.body);

    if (Object.keys(lieuData).length === 0 && Object.keys(hotelsData).length === 0) {
      return res.status(400).json({
        status: 'Erreur',
        message: 'Aucun champ à mettre à jour',
        statusCode: 400,
      });
    }

    // Début de la transaction
    await db.query('BEGIN');

    let lieuUpdated = null;
    let hotelsUpdated = null;

    // Mise à jour de la table Lieu si nécessaire
    if (Object.keys(lieuData).length > 0) {
      const fields = Object.keys(lieuData);
      const values = Object.values(lieuData);

      // Construction dynamique de la requête UPDATE
      const setQuery = fields.map((field, idx) => {
        if (field === 'etab_jour') {
          return `"${field}" = $${idx + 1}::text[]`;
        }
        if (field === 'geometry') {
          return `"${field}" = ST_GeomFromText($${idx + 1})`;
        }
        return `"${field}" = $${idx + 1}`;
      }).join(', ');

      const sql = `
        UPDATE "Lieu"
        SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${fields.length + 1} AND type = 'hotels'
        RETURNING *;
      `;

      const result = await db.query(sql, [...values, lieuId]);
      lieuUpdated = result.rows[0];
    }

    // Mise à jour de la table Hotels si nécessaire
    if (Object.keys(hotelsData).length > 0) {
      const fields = Object.keys(hotelsData);
      const values = Object.values(hotelsData);

      const setQuery = fields
        .map((field, idx) => `"${field}" = $${idx + 1}`)
        .join(', ');

      const sql = `
        UPDATE "Hotels"
        SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${fields.length + 1}
        RETURNING *;
      `;

      const result = await db.query(sql, [...values, lieuId]);
      hotelsUpdated = result.rows[0];
    }

    // Validation de la transaction
    await db.query('COMMIT');

    return res.status(200).json({
      status: 'Succès',
      message: 'Hôtel mis à jour avec succès',
      data: {
        lieu: lieuUpdated,
        hotels: hotelsUpdated
      }
    });

  } catch (err) {
    await db.query('ROLLBACK');
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la mise à jour de l\'hôtel',
      statusCode: 500,
    });
  }
});

// Route pour récupérer un parc ou jardin avec toutes ses informations
router.get('/parcs-jardins/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de parc/jardin invalide',
      statusCode: 400,
    });
  }

  try {
    const result = await db.query(
      `SELECT l.*, p.terrain
       FROM "Lieu" l
       JOIN "Parcs_Jardins" p ON l.id = p.id
       WHERE l.id = $1 AND l.status = TRUE`,
      [lieuId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Parc ou jardin non trouvé ou inactif',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Parc ou jardin récupéré avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération du parc ou jardin',
      statusCode: 500,
    });
  }
});

// Route pour mettre à jour un parc ou jardin existant
router.put('/parcs-jardins/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de parc/jardin invalide',
      statusCode: 400,
    });
  }

  try {
    // Schémas de validation pour les deux tables
    const lieuSchema = z.object({
      etab_images: z.array(z.string()).optional(),
      region_nom: z.string().optional(),
      prefecture_nom: z.string().optional(),
      commune_nom: z.string().optional(),
      canton_nom: z.string().optional(),
      nom_localite: z.string().optional(),
      etab_nom: z.string().optional(),
      etab_adresse: z.string().optional(),
      etab_jour: z.union([z.array(z.string()), z.string()]).optional(),
      toilette_type: z.string().optional(),
      activite_statut: z.string().optional(),
      activite_categorie: z.string().optional(),
      description: z.string().optional(),
      geometry: z.string().optional(),
      status: z.union([
        z.boolean(),
        z.string().transform(v => v.toLowerCase() === 'true')
      ]).optional()
    });

    const parcsJardinsSchema = z.object({
      terrain: z.string().optional()
    });

    // Validation et séparation des données
    const lieuData = lieuSchema.parse(req.body);
    const parcsJardinsData = parcsJardinsSchema.parse(req.body);

    if (Object.keys(lieuData).length === 0 && Object.keys(parcsJardinsData).length === 0) {
      return res.status(400).json({
        status: 'Erreur',
        message: 'Aucun champ à mettre à jour',
        statusCode: 400,
      });
    }

    // Début de la transaction
    await db.query('BEGIN');

    let lieuUpdated = null;
    let parcsJardinsUpdated = null;

    // Mise à jour de la table Lieu si nécessaire
    if (Object.keys(lieuData).length > 0) {
      const fields = Object.keys(lieuData);
      const values = Object.values(lieuData);

      // Construction dynamique de la requête UPDATE
      const setQuery = fields.map((field, idx) => {
        if (field === 'etab_jour') {
          return `"${field}" = $${idx + 1}::text[]`;
        }
        if (field === 'geometry') {
          return `"${field}" = ST_GeomFromText($${idx + 1})`;
        }
        return `"${field}" = $${idx + 1}`;
      }).join(', ');

      const sql = `
        UPDATE "Lieu"
        SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${fields.length + 1} AND type = 'parcs'
        RETURNING *;
      `;

      const result = await db.query(sql, [...values, lieuId]);
      if (result.rowCount === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          status: 'Erreur',
          message: 'Parc ou jardin non trouvé ou type incorrect',
          statusCode: 404,
        });
      }
      lieuUpdated = result.rows[0];
    }

    // Mise à jour de la table Parcs_Jardins si nécessaire
    if (Object.keys(parcsJardinsData).length > 0) {
      const fields = Object.keys(parcsJardinsData);
      const values = Object.values(parcsJardinsData);

      const setQuery = fields
        .map((field, idx) => `"${field}" = $${idx + 1}`)
        .join(', ');

      const sql = `
        UPDATE "Parcs_Jardins"
        SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${fields.length + 1}
        RETURNING *;
      `;

      const result = await db.query(sql, [...values, lieuId]);
      parcsJardinsUpdated = result.rows[0];
    }

    // Validation de la transaction
    await db.query('COMMIT');

    return res.status(200).json({
      status: 'Succès',
      message: 'Parc ou jardin mis à jour avec succès',
      data: {
        lieu: lieuUpdated,
        parcs_jardins: parcsJardinsUpdated
      }
    });
  } catch (err) {
    await db.query('ROLLBACK');
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la mise à jour du parc ou jardin',
      statusCode: 500,
    });
  }
});

// Route pour récupérer un marché avec toutes ses informations
router.get('/marches/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de marché invalide',
      statusCode: 400,
    });
  }

  try {
    const result = await db.query(
      `SELECT l.*, m.organisme
       FROM "Lieu" l
       JOIN "Marches" m ON l.id = m.id
       WHERE l.id = $1 AND l.status = TRUE`,
      [lieuId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Marché non trouvé ou inactif',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Marché récupéré avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération du marché',
      statusCode: 500,
    });
  }
});

// Route pour mettre à jour un marché existant
router.put('/marches/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de marché invalide',
      statusCode: 400,
    });
  }

  try {
    // Schémas de validation pour les deux tables
    const lieuSchema = z.object({
      etab_images: z.array(z.string()).optional(),
      region_nom: z.string().optional(),
      prefecture_nom: z.string().optional(),
      commune_nom: z.string().optional(),
      canton_nom: z.string().optional(),
      nom_localite: z.string().optional(),
      etab_nom: z.string().optional(),
      etab_jour: z.union([z.array(z.string()), z.string()]).optional(),
      geometry: z.string().optional(),
      status: z.union([
        z.boolean(),
        z.string().transform(v => v.toLowerCase() === 'true')
      ]).optional()
    });

    const marchesSchema = z.object({
      organisme: z.string().optional()
    });

    // Validation et séparation des données
    const lieuData = lieuSchema.parse(req.body);
    const marchesData = marchesSchema.parse(req.body);

    if (Object.keys(lieuData).length === 0 && Object.keys(marchesData).length === 0) {
      return res.status(400).json({
        status: 'Erreur',
        message: 'Aucun champ à mettre à jour',
        statusCode: 400,
      });
    }

    // Début de la transaction
    await db.query('BEGIN');

    let lieuUpdated = null;
    let marchesUpdated = null;

    // Mise à jour de la table Lieu si nécessaire
    if (Object.keys(lieuData).length > 0) {
      const fields = Object.keys(lieuData);
      const values = Object.values(lieuData);

      // Construction dynamique de la requête UPDATE
      const setQuery = fields.map((field, idx) => {
        if (field === 'etab_jour') {
          return `"${field}" = $${idx + 1}::text[]`;
        }
        if (field === 'geometry') {
          return `"${field}" = ST_GeomFromText($${idx + 1})`;
        }
        return `"${field}" = $${idx + 1}`;
      }).join(', ');

      const sql = `
        UPDATE "Lieu"
        SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${fields.length + 1} AND type = 'marches'
        RETURNING *;
      `;

      const result = await db.query(sql, [...values, lieuId]);
      if (result.rowCount === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          status: 'Erreur',
          message: 'Marché non trouvé ou type incorrect',
          statusCode: 404,
        });
      }
      lieuUpdated = result.rows[0];
    }

    // Mise à jour de la table Marches si nécessaire
    if (Object.keys(marchesData).length > 0) {
      const fields = Object.keys(marchesData);
      const values = Object.values(marchesData);

      const setQuery = fields
        .map((field, idx) => `"${field}" = $${idx + 1}`)
        .join(', ');

      const sql = `
        UPDATE "Marches"
        SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${fields.length + 1}
        RETURNING *;
      `;

      const result = await db.query(sql, [...values, lieuId]);
      marchesUpdated = result.rows[0];
    }

    // Validation de la transaction
    await db.query('COMMIT');

    return res.status(200).json({
      status: 'Succès',
      message: 'Marché mis à jour avec succès',
      data: {
        lieu: lieuUpdated,
        marches: marchesUpdated
      }
    });
  } catch (err) {
    await db.query('ROLLBACK');
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la mise à jour du marché',
      statusCode: 500,
    });
  }
});

// Route pour récupérer un site naturel avec toutes ses informations
router.get('/sites-naturels/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de site naturel invalide',
      statusCode: 400,
    });
  }

  try {
    const result = await db.query(
      `SELECT l.*, s.type_site_deux, s.ministere_tutelle, s.religion
       FROM "Lieu" l
       JOIN "Sites_Naturels" s ON l.id = s.id
       WHERE l.id = $1 AND l.status = TRUE`,
      [lieuId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Site naturel non trouvé ou inactif',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Site naturel récupéré avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération du site naturel',
      statusCode: 500,
    });
  }
});

// Route pour mettre à jour un site naturel existant
router.put('/sites-naturels/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de site naturel invalide',
      statusCode: 400,
    });
  }

  try {
    // Schémas de validation pour les deux tables
    const lieuSchema = z.object({
      region_nom: z.string().optional(),
      prefecture_nom: z.string().optional(),
      canton_nom: z.string().optional(),
      commune_nom: z.string().optional(),
      nom_localite: z.string().optional(),
      etab_nom: z.string().optional(),
      etab_adresse: z.string().optional(),
      etab_jour: z.union([z.array(z.string()), z.string()]).optional(),
      geometry: z.string().optional(),
      status: z.union([
        z.boolean(),
        z.string().transform(v => v.toLowerCase() === 'true')
      ]).optional()
    });

    const sitesNaturelsSchema = z.object({
      type_site_deux: z.string().optional(),
      ministere_tutelle: z.string().optional(),
      religion: z.string().optional()
    });

    // Validation et séparation des données
    const lieuData = lieuSchema.parse(req.body);
    const sitesNaturelsData = sitesNaturelsSchema.parse(req.body);

    if (Object.keys(lieuData).length === 0 && Object.keys(sitesNaturelsData).length === 0) {
      return res.status(400).json({
        status: 'Erreur',
        message: 'Aucun champ à mettre à jour',
        statusCode: 400,
      });
    }

    // Début de la transaction
    await db.query('BEGIN');

    let lieuUpdated = null;
    let sitesNaturelsUpdated = null;

    // Mise à jour de la table Lieu si nécessaire
    if (Object.keys(lieuData).length > 0) {
      const fields = Object.keys(lieuData);
      const values = Object.values(lieuData);

      // Construction dynamique de la requête UPDATE
      const setQuery = fields.map((field, idx) => {
        if (field === 'etab_jour') {
          return `"${field}" = $${idx + 1}::text[]`;
        }
        if (field === 'geometry') {
          return `"${field}" = ST_GeomFromText($${idx + 1})`;
        }
        return `"${field}" = $${idx + 1}`;
      }).join(', ');

      const sql = `
        UPDATE "Lieu"
        SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${fields.length + 1} AND type = 'sites'
        RETURNING *;
      `;

      const result = await db.query(sql, [...values, lieuId]);
      if (result.rowCount === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          status: 'Erreur',
          message: 'Site naturel non trouvé ou type incorrect',
          statusCode: 404,
        });
      }
      lieuUpdated = result.rows[0];
    }

    // Mise à jour de la table Sites_Naturels si nécessaire
    if (Object.keys(sitesNaturelsData).length > 0) {
      const fields = Object.keys(sitesNaturelsData);
      const values = Object.values(sitesNaturelsData);

      const setQuery = fields
        .map((field, idx) => `"${field}" = $${idx + 1}`)
        .join(', ');

      const sql = `
        UPDATE "Sites_Naturels"
        SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${fields.length + 1}
        RETURNING *;
      `;

      const result = await db.query(sql, [...values, lieuId]);
      sitesNaturelsUpdated = result.rows[0];
    }

    // Validation de la transaction
    await db.query('COMMIT');

    return res.status(200).json({
      status: 'Succès',
      message: 'Site naturel mis à jour avec succès',
      data: {
        lieu: lieuUpdated,
        sites_naturels: sitesNaturelsUpdated
      }
    });
  } catch (err) {
    await db.query('ROLLBACK');
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la mise à jour du site naturel',
      statusCode: 500,
    });
  }
});

// Route pour récupérer une zone protégée avec toutes ses informations
router.get('/zones-protegees/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de zone protégée invalide',
      statusCode: 400,
    });
  }

  try {
    const result = await db.query(
      `SELECT l.*
       FROM "Lieu" l
       JOIN "Zones_Protegees" z ON l.id = z.id
       WHERE l.id = $1 AND l.status = TRUE`,
      [lieuId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Zone protégée non trouvée ou inactive',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Zone protégée récupérée avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération de la zone protégée',
      statusCode: 500,
    });
  }
});

// Route pour mettre à jour une zone protégée existante
router.put('/zones-protegees/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de zone protégée invalide',
      statusCode: 400,
    });
  }

  try {
    // Schéma de validation pour la table Lieu (aucun champ spécifique pour Zones_Protegees)
    const lieuSchema = z.object({
      region_nom: z.string().optional(),
      prefecture_nom: z.string().optional(),
      commune_nom: z.string().optional(),
      canton_nom: z.string().optional(),
      nom_localite: z.string().optional(),
      etab_nom: z.string().optional(),
      etab_creation_date: z.string().optional(),
      etab_jour: z.union([z.array(z.string()), z.string()]).optional(),
      geometry: z.string().optional(),
      status: z.union([
        z.boolean(),
        z.string().transform(v => v.toLowerCase() === 'true')
      ]).optional()
    });

    const lieuData = lieuSchema.parse(req.body);

    if (Object.keys(lieuData).length === 0) {
      return res.status(400).json({
        status: 'Erreur',
        message: 'Aucun champ à mettre à jour',
        statusCode: 400,
      });
    }

    // Début de la transaction
    await db.query('BEGIN');

    const fields = Object.keys(lieuData);
    const values = Object.values(lieuData);
    const setQuery = fields.map((field, idx) => {
      if (field === 'etab_jour') {
        return `"${field}" = $${idx + 1}::text[]`;
      }
      if (field === 'geometry') {
        return `"${field}" = ST_GeomFromText($${idx + 1})`;
      }
      return `"${field}" = $${idx + 1}`;
    }).join(', ');

    const sql = `
      UPDATE "Lieu"
      SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1} AND type = 'zones'
      RETURNING *;
    `;

    const result = await db.query(sql, [...values, lieuId]);
    if (result.rowCount === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({
        status: 'Erreur',
        message: 'Zone protégée non trouvée ou type incorrect',
        statusCode: 404,
      });
    }

    // Validation de la transaction
    await db.query('COMMIT');

    return res.status(200).json({
      status: 'Succès',
      message: 'Zone protégée mise à jour avec succès',
      data: result.rows[0]
    });
  } catch (err) {
    await db.query('ROLLBACK');
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la mise à jour de la zone protégée',
      statusCode: 500,
    });
  }
});

// Route pour récupérer un supermarché établissement avec toutes ses informations
router.get('/supermarches-etablissement/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de supermarché établissement invalide',
      statusCode: 400,
    });
  }

  try {
    const result = await db.query(
      `SELECT l.*
       FROM "Lieu" l
       JOIN "Supermarches_Etablissement" s ON l.id = s.id
       WHERE l.id = $1 AND l.status = TRUE`,
      [lieuId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Supermarché établissement non trouvé ou inactif',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Supermarché établissement récupéré avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération du supermarché établissement',
      statusCode: 500,
    });
  }
});

// Route pour mettre à jour un supermarché établissement existant
router.put('/supermarches-etablissement/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de supermarché établissement invalide',
      statusCode: 400,
    });
  }

  try {
    // Schéma de validation pour la table Lieu (aucun champ spécifique pour Supermarches_Etablissement)
    const lieuSchema = z.object({
      region_nom: z.string().optional(),
      prefecture_nom: z.string().optional(),
      commune_nom: z.string().optional(),
      canton_nom: z.string().optional(),
      nom_localite: z.string().optional(),
      etab_nom: z.string().optional(),
      etab_adresse: z.string().optional(),
      etab_jour: z.union([z.array(z.string()), z.string()]).optional(),
      etab_creation_date: z.string().optional(),
      activite_statut: z.string().optional(),
      activite_categorie: z.string().optional(),
      toilette_type: z.string().optional(),
      geometry: z.string().optional(),
      status: z.union([
        z.boolean(),
        z.string().transform(v => v.toLowerCase() === 'true')
      ]).optional()
    });

    const lieuData = lieuSchema.parse(req.body);

    if (Object.keys(lieuData).length === 0) {
      return res.status(400).json({
        status: 'Erreur',
        message: 'Aucun champ à mettre à jour',
        statusCode: 400,
      });
    }

    // Début de la transaction
    await db.query('BEGIN');

    const fields = Object.keys(lieuData);
    const values = Object.values(lieuData);
    const setQuery = fields.map((field, idx) => {
      if (field === 'etab_jour') {
        return `"${field}" = $${idx + 1}::text[]`;
      }
      if (field === 'geometry') {
        return `"${field}" = ST_GeomFromText($${idx + 1})`;
      }
      return `"${field}" = $${idx + 1}`;
    }).join(', ');

    const sql = `
      UPDATE "Lieu"
      SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1} AND type = 'supermarches'
      RETURNING *;
    `;

    const result = await db.query(sql, [...values, lieuId]);
    if (result.rowCount === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({
        status: 'Erreur',
        message: 'Supermarché établissement non trouvé ou type incorrect',
        statusCode: 404,
      });
    }

    // Validation de la transaction
    await db.query('COMMIT');

    return res.status(200).json({
      status: 'Succès',
      message: 'Supermarché établissement mis à jour avec succès',
      data: result.rows[0]
    });
  } catch (err) {
    await db.query('ROLLBACK');
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la mise à jour du supermarché établissement',
      statusCode: 500,
    });
  }
});

// Route pour récupérer un établissement touristique avec toutes ses informations
router.get('/etablissements-touristiques/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID d\'établissement touristique invalide',
      statusCode: 400,
    });
  }

  try {
    const result = await db.query(
      `SELECT l.*
       FROM "Lieu" l
       JOIN "Etablissement_Touristique" e ON l.id = e.id
       WHERE l.id = $1 AND l.status = TRUE`,
      [lieuId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Établissement touristique non trouvé ou inactif',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Établissement touristique récupéré avec succès',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération de l\'établissement touristique',
      statusCode: 500,
    });
  }
});

// Route pour mettre à jour un établissement touristique existant
router.put('/etablissements-touristiques/:id', async (req, res) => {
  const { id } = req.params;
  const lieuId = parseInt(id, 10);

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID d\'établissement touristique invalide',
      statusCode: 400,
    });
  }

  try {
    // Schéma de validation pour la table Lieu (aucun champ spécifique pour Etablissement_Touristique)
    const lieuSchema = z.object({
      region_nom: z.string().optional(),
      prefecture_nom: z.string().optional(),
      commune_nom: z.string().optional(),
      canton_nom: z.string().optional(),
      nom_localite: z.string().optional(),
      etab_nom: z.string().optional(),
      etab_adresse: z.string().optional(),
      etab_jour: z.union([z.array(z.string()), z.string()]).optional(),
      geometry: z.string().optional(),
      status: z.union([
        z.boolean(),
        z.string().transform(v => v.toLowerCase() === 'true')
      ]).optional()
    });

    const lieuData = lieuSchema.parse(req.body);

    if (Object.keys(lieuData).length === 0) {
      return res.status(400).json({
        status: 'Erreur',
        message: 'Aucun champ à mettre à jour',
        statusCode: 400,
      });
    }

    // Début de la transaction
    await db.query('BEGIN');

    const fields = Object.keys(lieuData);
    const values = Object.values(lieuData);
    const setQuery = fields.map((field, idx) => {
      if (field === 'etab_jour') {
        return `"${field}" = $${idx + 1}::text[]`;
      }
      if (field === 'geometry') {
        return `"${field}" = ST_GeomFromText($${idx + 1})`;
      }
      return `"${field}" = $${idx + 1}`;
    }).join(', ');

    const sql = `
      UPDATE "Lieu"
      SET ${setQuery}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1} AND type = 'touristique'
      RETURNING *;
    `;

    const result = await db.query(sql, [...values, lieuId]);
    if (result.rowCount === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({
        status: 'Erreur',
        message: 'Établissement touristique non trouvé ou type incorrect',
        statusCode: 404,
      });
    }

    // Validation de la transaction
    await db.query('COMMIT');

    return res.status(200).json({
      status: 'Succès',
      message: 'Établissement touristique mis à jour avec succès',
      data: result.rows[0]
    });
  } catch (err) {
    await db.query('ROLLBACK');
    if (err instanceof z.ZodError) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Données invalides',
        errors: err.errors,
      });
    }

    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la mise à jour de l\'établissement touristique',
      statusCode: 500,
    });
  }
});

module.exports = router;