// schemas/userSchema.js
const { z } = require('zod');

const userSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  firstname: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  genre: z.enum(['masculin', 'feminin']).optional(),
  role: z.enum(['admin', 'utilisateur', 'gerant']).default('utilisateur'),
  active: z.boolean().default(true),
});

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

module.exports = { userSchema, loginSchema };