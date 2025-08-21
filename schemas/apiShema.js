const z = require('zod');

const lieuSchema = z.object({
  etabImages: z.array(z.string()).optional().default([]),
  regionNom: z.string().max(50),
  prefectureNom: z.string().max(50),
  communeNom: z.string().max(50),
  cantonNom: z.string().max(100),
  nomLocalite: z.string().max(100).optional().nullable(),
  etabNom: z.string().max(255),
  etabJour: z.array(z.string()).optional().default([]),
  toiletteType: z.string().max(50).optional().nullable(),
  etabAdresse: z.string().max(255).optional().nullable(),
  type: z.enum(['loisirs', 'hotels', 'parcs', 'marches', 'sites', 'zones', 'supermarches', 'touristique']),
  description: z.string().optional().nullable(),
  activiteStatut: z.string().max(50).optional().nullable(),
  activiteCategorie: z.string().max(50).optional().nullable(),
  etabCreationDate: z.string().max(50).optional().nullable(),
  geometry: z.string().refine(
    (val) => val.includes('POINT') || val.includes('POLYGON') || val.includes('MULTIPOLYGON'),
    { message: 'Geometry doit être un POINT, POLYGON ou MULTIPOLYGON' }
  ),
  status: z.boolean().optional().default(true)
});

const loisirsSchema = z.object({
  etablissement_type: z.string().max(50).optional().default('Non spécifié')
});

const hotelsSchema = z.object({});

const parcsSchema = z.object({
  terrain: z.string().max(50).optional().default('Non spécifié')
});
const marchesSchema = z.object({
  organisme: z.string().max(50).optional().default('Non spécifié')
});
const sitesSchema = z.object({
  typeSiteDeux: z.string().max(50).optional().default('Non spécifié'),
  ministereTutelle: z.string().max(50).optional().default('Non spécifié'),
  religion: z.string().max(50).optional().default('Néant')
});
const zonesSchema = z.object({});
const supermarchesSchema = z.object({});
const touristiqueSchema = z.object({});

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