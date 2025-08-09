const express = require('express');
// Crée une instance de Router pour définir les routes de l'API
const router = express.Router();
// Importe la connexion à la base de données
const db = require('../libraries/Database');
// Importe les schémas de validation Zod pour les entités Lieu et Réservation
const { lieuSchema, reservationSchema } = require('../schemas/apiShema');
const z = require('zod');

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

// Route pour créer un nouveau lieu (avec support automatique des loisirs)
router.post('/lieux', async (req, res) => {
  try {
    // Validation des données avec Zod
    const data = lieuSchema.parse(req.body);

    // Insertion du lieu dans la base de données
    const result = await db.query(
      `INSERT INTO "Lieu" (
        region_nom, prefecture_nom, canton_nom, nom_localite, etab_nom, 
        etab_jour, toilette_type, etab_adresse, type, activite_statut, 
        activite_categorie, etab_creation_date, geometry, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, ST_GeomFromText($13), $14)
       RETURNING id, region_nom, prefecture_nom, canton_nom, etab_nom, type`,
      [
        data.region_nom,
        data.prefecture_nom,
        data.canton_nom,
        data.nom_localite || null,
        data.etab_nom,
        data.etab_jour ? `{${data.etab_jour.join(',')}}` : null, // Conversion tableau vers format PostgreSQL ARRAY
        data.toilette_type || null,
        data.etab_adresse || null,
        data.type,
        data.activite_statut || null,
        data.activite_categorie || null,
        data.etab_creation_date || null,
        data.geometry, // Format WKT attendu (ex: "POINT(0 0)")
        data.status,
      ]
    );

    // Création automatique d'un enregistrement loisir si le type est "loisirs"
    if (data.type === 'loisirs' && data.etablissement_type) {
      await db.query(
        `INSERT INTO "Loisirs" (id, etablissement_type) VALUES ($1, $2)`,
        [result.rows[0].id, data.etablissement_type]
      );
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
      region_nom: z.string().optional(),
      prefecture_nom: z.string().optional(),
      canton_nom: z.string().optional(),
      etab_nom: z.string().optional(),
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

      const setQuery = fields
        .map((field, idx) => `"${field}" = $${idx + 1}`)
        .join(', ');

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

module.exports = router;