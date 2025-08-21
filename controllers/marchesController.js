const prisma = require('../Libraries/prisma');
const z = require('zod');
const { lieuSchema, marchesSchema } = require('../schemas/apiShema');

exports.getMarche = async (req, res) => {
  const lieuId = parseInt(req.params.id, 10);
  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({ status: 'Erreur', message: 'ID de marché invalide', statusCode: 400 });
  }
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT l.*, m.organisme FROM "Lieu" l JOIN "Marches" m ON l.id = m.id WHERE l.id = $1 AND l.status = TRUE`,
      [lieuId]
    );
    if (result.length === 0) {
      return res.status(404).json({ status: 'Erreur', message: 'Marché non trouvé ou inactif', statusCode: 404 });
    }
    return res.status(200).json({ status: 'Succès', message: 'Marché récupéré avec succès', data: result[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'Erreur', message: 'Erreur lors de la récupération du marché', statusCode: 500 });
  }
};

exports.updateMarche = async (req, res) => {
  const lieuId = parseInt(req.params.id, 10);
  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({ status: 'Erreur', message: 'ID de marché invalide', statusCode: 400 });
  }
  try {
    const lieuData = lieuSchema.parse(req.body);
    const marchesData = marchesSchema.parse(req.body);
    if (Object.keys(lieuData).length === 0 && Object.keys(marchesData).length === 0) {
      return res.status(400).json({ status: 'Erreur', message: 'Aucun champ à mettre à jour', statusCode: 400 });
    }
    await prisma.$transaction(async (tx) => {
      if (Object.keys(lieuData).length > 0 && lieuData.geometry) {
        const fields = Object.keys(lieuData);
        const values = Object.values(lieuData);
        const setQuery = fields.map((field, idx) => {
          if (field === 'etab_jour') return `"${field}" = $${idx + 1}::text[]`;
          if (field === 'geometry') return `"${field}" = ST_GeomFromText($${idx + 1})`;
          return `"${field}" = $${idx + 1}`;
        }).join(', ');
        await tx.$executeRawUnsafe(`UPDATE "Lieu" SET ${setQuery}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1} AND type = 'marches'`, ...values, lieuId);
      } else if (Object.keys(lieuData).length > 0) {
        await tx.lieu.update({ where: { id: lieuId }, data: lieuData });
      }
      if (Object.keys(marchesData).length > 0) {
        await tx.marches.update({ where: { id: lieuId }, data: marchesData });
      }
    });
    return res.status(200).json({ status: 'Succès', message: 'Marché mis à jour avec succès', data: {} });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({ status: 'Erreur', message: 'Données invalides', errors: err.errors });
    }
    console.error(err);
    return res.status(500).json({ status: 'Erreur', message: 'Erreur lors de la mise à jour du marché', statusCode: 500 });
  }
};