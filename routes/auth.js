// routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../libraries/Database');
const jwt = require('../libraries/JWT');
const bcrypt = require('bcrypt');
const { userSchema, loginSchema } = require('../schemas/userSchema');
const z = require('zod');
const nodemailer = require('nodemailer'); // Importe nodemailer
require('dotenv').config(); // Charge les variables d'environnement depuis .env

// Configure le transporteur nodemailer pour Mailtrap
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Applique le middleware d'authentification aux routes nécessitant une authentification
router.use('/logout', require('../middleware/auth_middleware')); // Appliqué spécifiquement à /logout
router.use('/delete-account', require('../middleware/auth_middleware')); // Appliqué à /delete-account

// Route POST pour enregistrer un nouvel utilisateur
router.post('/register', async (req, res) => {
  try {
    const data = userSchema.parse(req.body);
    const existingUser = await db.query('SELECT id FROM "User" WHERE email = $1', [data.email]);
    if (existingUser.rowCount > 0) {
      return res.status(400).json({
        status: 'Erreur',
        message: 'Cet email est déjà utilisé',
        statusCode: 400,
      });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    const result = await db.query(
      `INSERT INTO "User" (name, firstname, genre, email, password, role, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, firstname, email, role`,
      [data.name, data.firstname, data.genre || null, data.email, hashedPassword, data.role, data.active]
    );
    const token = await jwt.generateToken({ id: result.rows[0].id });
    return res.status(201).json({
      status: 'Succès',
      message: 'Inscription réussie',
      data: { accessToken: token, user: result.rows[0] },
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
      message: "Échec de l'inscription",
      statusCode: 400,
      error: err.message,
    });
  }
});

// Route POST pour authentifier un utilisateur
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await db.query('SELECT * FROM "User" WHERE email = $1', [data.email]);
    if (user.rowCount === 0) {
      return res.status(401).json({
        status: 'Erreur',
        message: 'Utilisateur non trouvé',
        statusCode: 401,
      });
    }
    const isMatch = await bcrypt.compare(data.password, user.rows[0].password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'Erreur',
        message: 'Mot de passe incorrect',
        statusCode: 401,
      });
    }
    const token = await jwt.generateToken({ id: user.rows[0].id });
    return res.status(200).json({
      status: 'Succès',
      message: 'Connexion réussie',
      data: {
        accessToken: token,
        user: {
          id: user.rows[0].id,
          name: user.rows[0].name,
          firstname: user.rows[0].firstname,
          email: user.rows[0].email,
          role: user.rows[0].role,
        },
      },
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
    return res.status(401).json({
      status: 'Erreur',
      message: 'Authentification échouée',
      statusCode: 401,
      error: err.message,
    });
  }
});

// Route POST pour déconnecter un utilisateur
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]; // Déjà validé par le middleware
    // Pas d'invalidation serveur, la déconnexion est gérée côté client
    return res.status(200).json({
      status: 'Succès',
      message: 'Déconnexion réussie',
    });
  } catch (err) {
    console.error('Erreur lors de la déconnexion:', err.message);
    return res.status(400).json({
      status: 'Erreur',
      message: 'Échec de la déconnexion',
      statusCode: 400,
      error: err.message,
    });
  }
});

// Route POST pour gérer la réinitialisation du mot de passe (oubli)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !z.string().email().safeParse(email).success) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Email invalide',
        statusCode: 422,
      });
    }

    const user = await db.query('SELECT id FROM "User" WHERE email = $1', [email]);
    if (user.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Utilisateur non trouvé',
        statusCode: 404,
      });
    }

    const resetToken = await jwt.generateToken({ id: user.rows[0].id, type: 'reset' }); // Valable 1 heure

    // Envoie l'email à une inbox fictive de Mailtrap
    const mailOptions = {
      from: process.env.EMAIL_USER, // Adresse Mailtrap comme expéditeur
      to: 'test@ton-inbox.mailtrap.io', // Remplace par ton inbox Mailtrap
      subject: 'Réinitialisation de votre mot de passe',
      text: `Cliquez sur ce lien pour réinitialiser votre mot de passe : http://localhost:3030/reset-password?token=${resetToken}`,
      html: `<p>Cliquez <a href="http://localhost:3030/reset-password?token=${resetToken}">ici</a> pour réinitialiser votre mot de passe.</p>`,
    };

    // Envoie l'email via Mailtrap
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      status: 'Succès',
      message: 'Un email de réinitialisation a été envoyé à ton inbox Mailtrap',
      data: { resetToken },
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      status: 'Erreur',
      message: 'Échec de la demande de réinitialisation',
      statusCode: 400,
      error: err.message,
    });
  }
});

// Route DELETE pour supprimer un compte utilisateur
router.delete('/delete-account', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        status: 'Erreur',
        message: 'Utilisateur non authentifié',
        statusCode: 401,
      });
    }
    const result = await db.query('DELETE FROM "User" WHERE id = $1 RETURNING id', [userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Utilisateur non trouvé',
        statusCode: 404,
      });
    }
    return res.status(200).json({
      status: 'Succès',
      message: 'Compte supprimé avec succès',
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      status: 'Erreur',
      message: 'Échec de la suppression du compte',
      statusCode: 400,
      error: err.message,
    });
  }
});

// Route POST pour réinitialiser le mot de passe avec un token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = await jwt.verifyToken(token);
    if (!decoded || !decoded.id || decoded.type !== 'reset') {
      return res.status(400).json({
        status: 'Erreur',
        message: 'Token invalide ou expiré',
        statusCode: 400,
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(422).json({
        status: 'Erreur',
        message: 'Le mot de passe doit contenir au moins 6 caractères',
        statusCode: 422,
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const result = await db.query(
      'UPDATE "User" SET password = $1 WHERE id = $2 RETURNING id',
      [hashedPassword, decoded.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Utilisateur non trouvé',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Mot de passe réinitialisé avec succès',
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      status: 'Erreur',
      message: 'Échec de la réinitialisation du mot de passe',
      statusCode: 400,
      error: err.message,
    });
  }
});

// Route PUT pour modifier les informations du profil utilisateur
router.put('/update-profile', require('../middleware/auth_middleware'), async (req, res) => {
  try {
    const userId = req.userId;
    
    // Schéma de validation pour la mise à jour du profil
    const updateProfileSchema = z.object({
      name: z.string().min(1, 'Le nom ne peut pas être vide').optional(),
      firstname: z.string().min(1, 'Le prénom ne peut pas être vide').optional(),
      genre: z.enum(['masculin', 'féminin', 'autre']).optional(),
      email: z.string().email('Email invalide').optional(),
      currentPassword: z.string().optional(), // Requis seulement si on change l'email ou le mot de passe
      newPassword: z.string().min(6, 'Le nouveau mot de passe doit contenir au moins 6 caractères').optional(),
    });

    const data = updateProfileSchema.parse(req.body);

    // Vérification qu'au moins un champ est fourni pour la mise à jour
    const updatableFields = ['name', 'firstname', 'genre', 'email', 'newPassword'];
    const providedFields = updatableFields.filter(field => data[field] !== undefined);
    
    if (providedFields.length === 0) {
      return res.status(400).json({
        status: 'Erreur',
        message: 'Aucun champ à mettre à jour',
        statusCode: 400,
      });
    }

    // Récupération des informations actuelles de l'utilisateur
    const currentUser = await db.query('SELECT * FROM "User" WHERE id = $1', [userId]);
    if (currentUser.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Utilisateur non trouvé',
        statusCode: 404,
      });
    }

    // Vérification du mot de passe actuel si changement sensible (email ou mot de passe)
    if (data.email || data.newPassword) {
      if (!data.currentPassword) {
        return res.status(400).json({
          status: 'Erreur',
          message: 'Mot de passe actuel requis pour modifier l\'email ou le mot de passe',
          statusCode: 400,
        });
      }

      const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, currentUser.rows[0].password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          status: 'Erreur',
          message: 'Mot de passe actuel incorrect',
          statusCode: 401,
        });
      }
    }

    // Vérification de l'unicité de l'email si changement d'email
    if (data.email && data.email !== currentUser.rows[0].email) {
      const existingEmail = await db.query('SELECT id FROM "User" WHERE email = $1 AND id != $2', [data.email, userId]);
      if (existingEmail.rowCount > 0) {
        return res.status(409).json({
          status: 'Erreur',
          message: 'Cet email est déjà utilisé par un autre utilisateur',
          statusCode: 409,
        });
      }
    }

    // Début de la transaction
    await db.query('BEGIN');

    // Préparation des champs à mettre à jour
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (data.name) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(data.name);
      paramIndex++;
    }

    if (data.firstname) {
      updateFields.push(`firstname = $${paramIndex}`);
      updateValues.push(data.firstname);
      paramIndex++;
    }

    if (data.genre) {
      updateFields.push(`genre = $${paramIndex}`);
      updateValues.push(data.genre);
      paramIndex++;
    }

    if (data.email) {
      updateFields.push(`email = $${paramIndex}`);
      updateValues.push(data.email);
      paramIndex++;
    }

    // Hachage du nouveau mot de passe si fourni
    if (data.newPassword) {
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(data.newPassword, saltRounds);
      updateFields.push(`password = $${paramIndex}`);
      updateValues.push(hashedNewPassword);
      paramIndex++;
    }

    // Ajout du timestamp de mise à jour
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Construction et exécution de la requête UPDATE
    const updateQuery = `
      UPDATE "User" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, firstname, email, genre, role, active, created_at, updated_at
    `;
    
    updateValues.push(userId);

    const result = await db.query(updateQuery, updateValues);

    // Validation de la transaction
    await db.query('COMMIT');

    return res.status(200).json({
      status: 'Succès',
      message: 'Profil mis à jour avec succès',
      data: {
        user: result.rows[0],
        fieldsUpdated: providedFields.filter(field => field !== 'newPassword') // Ne pas inclure newPassword dans la réponse
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

    console.error('Erreur lors de la mise à jour du profil:', err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la mise à jour du profil',
      statusCode: 500,
    });
  }
});

// Route GET pour récupérer les informations du profil utilisateur
router.get('/profile', require('../middleware/auth_middleware'), async (req, res) => {
  try {
    const userId = req.userId;

    const user = await db.query(
      'SELECT id, name, firstname, email, genre, role, active, created_at, updated_at FROM "User" WHERE id = $1',
      [userId]
    );

    if (user.rowCount === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Utilisateur non trouvé',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Profil récupéré avec succès',
      data: {
        user: user.rows[0]
      }
    });

  } catch (err) {
    console.error('Erreur lors de la récupération du profil:', err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération du profil',
      statusCode: 500,
    });
  }
});

module.exports = router;