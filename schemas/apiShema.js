const { z } = require('zod');

const lieuSchema = z.object({
  region_nom: z.string().min(1, 'Le nom de la région est requis'),
  prefecture_nom: z.string().min(1, 'Le nom de la préfecture est requis'),
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
  etab_creation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de création invalide').optional(),
  geometry: z.string().min(1, 'La géométrie est requise'),
  status: z.boolean().default(true),
  etablissement_type: z.string().optional(), // Ajout pour les lieux de type "loisirs"
});


module.exports = { lieuSchema };