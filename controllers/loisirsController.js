const prisma = require('../Libraries/prisma');
const z = require('zod');
const { lieuSchema, loisirsSchema } = require('../schemas/apiShema');

exports.updateLoisir = async (req, res) => {
  const lieuId = parseInt(req.params.id, 10);
  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({ status: 'Erreur', message: 'ID de loisir invalide', statusCode: 400 });
  }
  try {
    const lieuData = lieuSchema.parse(req.body);
    const loisirsData = loisirsSchema.parse(req.body);
    if (Object.keys(lieuData).length === 0 && Object.keys(loisirsData).length === 0) {
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
        await tx.$executeRawUnsafe(`UPDATE "Lieu" SET ${setQuery}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1}`, ...values, lieuId);
      } else if (Object.keys(lieuData).length > 0) {
        await tx.lieu.update({ where: { id: lieuId }, data: lieuData });
      }
      if (Object.keys(loisirsData).length > 0) {
        await tx.loisirs.update({ where: { id: lieuId }, data: loisirsData });
      }
    });
    return res.status(200).json({ status: 'Succès', message: 'Loisir mis à jour avec succès', data: {} });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({ status: 'Erreur', message: 'Données invalides', errors: err.errors });
    }
    console.error(err);
    return res.status(500).json({ status: 'Erreur', message: 'Erreur lors de la mise à jour', statusCode: 500 });
  }
};

exports.getLoisir = async (req, res) => {
  const lieuId = parseInt(req.params.id, 10);
  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({ status: 'Erreur', message: 'ID de loisir invalide', statusCode: 400 });
  }
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT l.*, lo.etablissement_type FROM "Lieu" l JOIN "Loisirs" lo ON l.id = lo.id WHERE l.id = $1 AND l.status = TRUE`,
      [lieuId]
    );
    if (result.length === 0) {
      return res.status(404).json({ status: 'Erreur', message: 'Loisir non trouvé ou inactif', statusCode: 404 });
    }
    return res.status(200).json({ status: 'Succès', message: 'Loisir récupéré avec succès', data: result[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'Erreur', message: 'Erreur lors de la récupération du loisir', statusCode: 500 });
  }
};

exports.createMenu = async (req, res) => {
  const loisirId = parseInt(req.params.id, 10);
  if (isNaN(loisirId) || loisirId <= 0) {
    return res.status(400).json({ status: 'Erreur', message: 'ID de loisir invalide', statusCode: 400 });
  }
  try {
    const menuSchema = z.object({ id_Menu: z.string().uuid(), nom_Menu: z.string(), Description: z.string().optional() });
    const data = menuSchema.parse(req.body);
    const check = await prisma.menu.findUnique({ where: { id_Menu: loisirId } });
    if (!check) {
      return res.status(404).json({ status: 'Erreur', message: 'Loisir non trouvé', statusCode: 404 });
    }
    const result = await prisma.menu.create({
      data: { id_Menu: data.id_Menu, nom_Menu: data.nom_Menu, Description: data.Description, loisir_id: loisirId }
    });
    return res.status(201).json({ status: 'Succès', message: 'Menu créé avec succès', data: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({ status: 'Erreur', message: 'Données invalides', errors: err.errors });
    }
    console.error(err);
    return res.status(400).json({ status: 'Erreur', message: 'Erreur lors de la création du menu', statusCode: 400 });
  }
};

exports.getMenus = async (req, res) => {
  const loisirId = parseInt(req.params.id, 10);
  if (isNaN(loisirId) || loisirId <= 0) {
    return res.status(400).json({ status: 'Erreur', message: 'ID de loisir invalide', statusCode: 400 });
  }
  try {
    const result = await prisma.menu.findMany({ where: { loisir_id: loisirId } });
    return res.status(200).json({ status: 'Succès', message: 'Menus récupérés avec succès', data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'Erreur', message: 'Erreur lors de la récupération des menus', statusCode: 500 });
  }
};