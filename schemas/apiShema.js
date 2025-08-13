const { z } = require('zod');

const lieuSchema = z.object({
  etab_images: z.array(z.string()).optional(),
  region_nom: z.string().min(1, 'Le nom de la région est requis'),
  prefecture_nom: z.string().min(1, 'Le nom de la préfecture est requis'),
  commune_nom: z.string().min(1, 'Le nom de la commune est requis'),
  canton_nom: z.string().min(1, 'Le nom du canton est requis'),
  nom_localite: z.string().optional(),
  etab_nom: z.string().min(1, "Le nom de l'établissement est requis"),
  etab_jour: z
    .array(z.enum(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']))
    .optional(),
  toilette_type: z
    .enum(['Connectees au reseau', 'toilettes seches', 'Latrines a eau', 'WCs', 'Douches', 'Nsp'])
    .optional(),
  etab_adresse: z.string().optional(),
  type: z.enum(['loisirs', 'hotels', 'parcs', 'marches', 'sites', 'zones', 'supermarches', 'touristique']),
  description: z.string().optional(),
  activite_statut: z
    .enum(['construction achevée', 'Construction en Projet', 'Construit et Utilise', 'Néant'])
    .optional(),
  activite_categorie: z
    .enum([
      'Jardin ou parc public',
      'Lieu de sport et loisir vert',
      'autre',
      'Decoration sur la voie publique',
      'Vente electro-menager',
      'Alimentation Générale',
      'Commerce général',
      'Supérette',
      'Vente de matériaux de construction',
      'Néant',
      'Nsp',
    ])
    .optional(),
  etab_creation_date: z.string().min(1, 'Date de création requis').optional(),
  geometry: z.string().min(1, 'La géométrie est requise'),
  status: z.boolean().default(true),
  etablissement_type: z.string().optional(), // Ajout pour les lieux de type "loisirs"
});

// Schémas pour les types de lieux spécifiques
const loisirsSchema = z.object({
  etablissement_type: z.string().optional()
});

const hotelsSchema = z.object({
  // Pas de champs spécifiques, mais la table existe
});

const parcsSchema = z.object({
  terrain: z.string().optional(),
});

const marchesSchema = z.object({
  organisme: z.string().optional(),
});

const sitesSchema = z.object({
  type_site_deux: z.string().optional(),
  ministere_tutelle: z.string().optional(),
  religion: z.string().optional()
});

const zonesSchema = z.object({
  // Pas de champs spécifiques, mais la table existe
});

const supermarchesSchema = z.object({
  // Pas de champs spécifiques, mais la table existe
});

const touristiqueSchema = z.object({
  // Pas de champs spécifiques, mais la table existe
});

// Export des schémas
module.exports = {
  lieuSchema,
  loisirsSchema,
  hotelsSchema,
  parcsSchema,
  marchesSchema,
  sitesSchema,
  zonesSchema,
  supermarchesSchema,
  touristiqueSchema
};