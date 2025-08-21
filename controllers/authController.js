const prisma = require("../Libraries/prisma");
const bcrypt = require("bcrypt");
const { userSchema } = require("../schemas/userSchema");
const z = require("zod");
const jwt = require("../Libraries/Jwt"); // Ajout de l'import JWT
const nodemailer = require("nodemailer"); // Ajout de nodemailer
const express = require("express");
const router = express.Router();

// Configure le transporteur nodemailer pour Mailtrap
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const register = async (req, res) => {
  try {
    const validatedData = userSchema.parse(req.body);
    const { name, firstname, email, password, genre, role } = validatedData;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        firstname,
        email,
        password: hashedPassword,
        genre,
        role: role || "utilisateur",
        active: true,
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    return res.status(201).json({
      message: "Inscription réussie",
      user: userWithoutPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(422)
        .json({ message: "Données invalides", errors: error.errors });
    }
    console.error("Erreur lors de l'inscription:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// Route POST pour gérer la réinitialisation du mot de passe (oubli)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !z.string().email().safeParse(email).success) {
      return res.status(422).json({
        status: "Erreur",
        message: "Email invalide",
        statusCode: 422,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({
        status: "Erreur",
        message: "Utilisateur non trouvé",
        statusCode: 404,
      });
    }

    const resetToken = await jwt.generateToken({ id: user.id, type: "reset" });

    // Envoi de l'email à l'adresse réelle de l'utilisateur
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email, // Envoyer à l'email réel de l'utilisateur
      subject: "Réinitialisation de votre mot de passe",
      text: `Cliquez sur ce lien pour réinitialiser votre mot de passe : ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
      html: `<p>Cliquez <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">ici</a> pour réinitialiser votre mot de passe.</p>`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      status: "Succès",
      message: "Un email de réinitialisation a été envoyé",
      // Ne pas renvoyer le token en production pour des raisons de sécurité
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "Erreur",
      message: "Échec de la demande de réinitialisation",
      statusCode: 500,
    });
  }
};

// Route DELETE pour supprimer un compte utilisateur
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user?.id; // Passport stocke dans req.user
    if (!userId) {
      return res.status(401).json({
        status: "Erreur",
        message: "Utilisateur non authentifié",
        statusCode: 401,
      });
    }

    const deletedUser = await prisma.user.delete({
      where: { id: userId },
      select: { id: true },
    });

    if (!deletedUser) {
      return res.status(404).json({
        status: "Erreur",
        message: "Utilisateur non trouvé",
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: "Succès",
      message: "Compte supprimé avec succès",
    });
  } catch (err) {
    console.error(err);
    if (err.code === "P2025") {
      // Prisma: Record not found
      return res.status(404).json({
        status: "Erreur",
        message: "Utilisateur non trouvé",
        statusCode: 404,
      });
    }
    return res.status(500).json({
      status: "Erreur",
      message: "Échec de la suppression du compte",
      statusCode: 500,
    });
  }
};

// Route POST pour réinitialiser le mot de passe avec un token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = await jwt.verifyToken(token);
    if (!decoded || !decoded.id || decoded.type !== "reset") {
      return res.status(400).json({
        status: "Erreur",
        message: "Token invalide ou expiré",
        statusCode: 400,
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(422).json({
        status: "Erreur",
        message: "Le mot de passe doit contenir au moins 6 caractères",
        statusCode: 422,
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const updatedUser = await prisma.user.update({
      where: { id: String(decoded.id) }, // S'assurer que c'est une string
      data: { password: hashedPassword },
      select: { id: true },
    });

    if (!updatedUser) {
      return res.status(404).json({
        status: "Erreur",
        message: "Utilisateur non trouvé",
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: "Succès",
      message: "Mot de passe réinitialisé avec succès",
    });
  } catch (err) {
    console.error(err);
    if (err.code === "P2025") {
      // Prisma: Record not found
      return res.status(404).json({
        status: "Erreur",
        message: "Utilisateur non trouvé",
        statusCode: 404,
      });
    }
    return res.status(500).json({
      status: "Erreur",
      message: "Échec de la réinitialisation du mot de passe",
      statusCode: 500,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    console.log("Debug - req.user:", req.user);
    console.log("Debug - req.body:", req.body);

    const userId = req.user?.id; // Passport stocke dans req.user

    // Vérification que userId existe
    if (!userId) {
      return res.status(401).json({
        status: "Erreur",
        message: "Utilisateur non authentifié",
        statusCode: 401,
      });
    }

    // Schéma de validation pour la mise à jour du profil
    const updateProfileSchema = z.object({
      name: z.string().min(1, "Le nom ne peut pas être vide").optional(),
      firstname: z
        .string()
        .min(1, "Le prénom ne peut pas être vide")
        .optional(),
      genre: z.enum(["masculin", "feminin"]).optional(),
      email: z.string().email("Email invalide").optional(),
      currentPassword: z.string().optional(),
      newPassword: z
        .string()
        .min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères")
        .optional(),
      role: z.enum(["utilisateur", "gerant", "admin"]).optional(), // Ajout de role avec les valeurs possibles
      active: z.boolean().optional(), // Ajout de active comme boolean
    });

    // Validation des données avec gestion d'erreur immédiate
    const validationResult = updateProfileSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.log("Erreur de validation Zod:", validationResult.error);

      // Récupère toutes les erreurs en parcourant le tableau
      const message_zod = validationResult.error.issues.map((err) => ({
        champ: err.path.join("."), // transforme ["newPassword"] en "newPassword"
        message: err.message,
      }));

      return res.status(422).json({
        status: "Erreur",
        message: "Données invalides",
        statusCode: 422,
        message_zod, // renvoie toutes les erreurs sous forme de tableau
      });
    }

    const data = validationResult.data;

    // Vérification qu'au moins un champ est fourni pour la mise à jour
    const updatableFields = [
      "name",
      "firstname",
      "genre",
      "email",
      "newPassword",
      "role",
      "active", // Ajout de active
    ];
    const providedFields = updatableFields.filter(
      (field) => data[field] !== undefined
    );

    if (providedFields.length === 0) {
      return res.status(400).json({
        status: "Erreur",
        message: "Aucun champ à mettre à jour",
        statusCode: 400,
      });
    }

    // Récupération des informations actuelles de l'utilisateur
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true, role: true }, // Ajout de role pour vérification
    });

    if (!currentUser) {
      return res.status(404).json({
        status: "Erreur",
        message: "Utilisateur non trouvé",
        statusCode: 404,
      });
    }

    // Vérification du mot de passe actuel si changement sensible
    const sensitiveFields = ["email", "newPassword", "role", "active"]; // Ajout de role et active comme champs sensibles
    if (sensitiveFields.some(field => data[field] !== undefined)) {
      if (!data.currentPassword) {
        return res.status(400).json({
          status: "Erreur",
          message: "Mot de passe actuel requis pour modifier les champs sensibles",
          statusCode: 400,
        });
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        data.currentPassword,
        currentUser.password
      );
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          status: "Erreur",
          message: "Mot de passe actuel incorrect",
          statusCode: 401,
        });
      }

      // Vérification des permissions pour modifier role (ex. seulement les admins)
      if (data.role && currentUser.role !== "admin") {
        return res.status(403).json({
          status: "Erreur",
          message: "Seul un administrateur peut modifier le rôle",
          statusCode: 403,
        });
      }
    }

    // Vérification de l'unicité de l'email si changement d'email
    if (data.email && data.email !== currentUser.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });

      if (existingEmail && existingEmail.id !== userId) {
        return res.status(409).json({
          status: "Erreur",
          message: "Cet email est déjà utilisé par un autre utilisateur",
          statusCode: 409,
        });
      }
    }

    // Préparation des données à mettre à jour
    const updateData = {};

    if (data.name) updateData.name = data.name;
    if (data.firstname) updateData.firstname = data.firstname;
    if (data.genre) updateData.genre = data.genre;
    if (data.email) updateData.email = data.email;
    if (data.newPassword) updateData.password = await bcrypt.hash(data.newPassword, 10);
    if (data.role) updateData.role = data.role; // Ajout de role
    if (data.active !== undefined) updateData.active = data.active; // Ajout de active

    // Mise à jour de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        firstname: true,
        email: true,
        genre: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      status: "Succès",
      message: "Profil mis à jour avec succès",
      data: {
        user: updatedUser,
      },
    });
  } catch (err) {
    console.error("Erreur lors de la mise à jour du profil:", err);
    return res.status(500).json({
      status: "Erreur",
      message: "Erreur lors de la mise à jour du profil",
      statusCode: 500,
    });
  }
};

// Route GET pour récupérer les informations du profil utilisateur
const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id; // Passport stocke dans req.user

    // Vérification que userId existe
    if (!userId) {
      return res.status(401).json({
        status: "Erreur",
        message: "Utilisateur non authentifié",
        statusCode: 401,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        firstname: true,
        email: true,
        genre: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "Erreur",
        message: "Utilisateur non trouvé",
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: "Succès",
      message: "Profil récupéré avec succès",
      data: { user },
    });
  } catch (err) {
    console.error("Erreur lors de la récupération du profil:", err);
    return res.status(500).json({
      status: "Erreur",
      message: "Erreur lors de la récupération du profil",
      statusCode: 500,
    });
  }
};

module.exports = {
  register,
  forgotPassword,
  resetPassword,
  deleteAccount,
  updateProfile,
  getProfile,
  router,
};
