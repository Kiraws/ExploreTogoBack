const prisma = require('../Libraries/prisma');
const z = require('zod');

exports.createCategorie = async (req, res) => {
  const { menuId } = req.params;
  try {
    const categorieSchema = z.object({ idCategorie: z.string().uuid(), nom_Categorie: z.string(), description: z.string().optional() });
    const data = categorieSchema.parse(req.body);
    const check = await prisma.menu.findUnique({ where: { id_Menu: menuId } });
    if (!check) {
      return res.status(404).json({ status: 'Erreur', message: 'Menu non trouvé', statusCode: 404 });
    }
    const result = await prisma.categoriePlat.create({
      data: { idCategorie: data.idCategorie, nom_Categorie: data.nom_Categorie, description: data.description, id_Menu: menuId }
    });
    return res.status(201).json({ status: 'Succès', message: 'Catégorie de plat créée avec succès', data: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({ status: 'Erreur', message: 'Données invalides', errors: err.errors });
    }
    console.error(err);
    return res.status(400).json({ status: 'Erreur', message: 'Erreur lors de la création de la catégorie', statusCode: 400 });
  }
};

exports.createPlat = async (req, res) => {
  const { categorieId } = req.params;
  try {
    const platSchema = z.object({ nom_plat: z.string(), description: z.string().optional(), prix: z.number().positive(), disponible: z.boolean().optional() });
    const data = platSchema.parse(req.body);
    const check = await prisma.categoriePlat.findUnique({ where: { idCategorie: categorieId } });
    if (!check) {
      return res.status(404).json({ status: 'Erreur', message: 'Catégorie non trouvée', statusCode: 404 });
    }
    const result = await prisma.plat.create({
      data: { nom_plat: data.nom_plat, description: data.description, prix: data.prix, disponible: data.disponible ?? true, idCategorie: categorieId }
    });
    return res.status(201).json({ status: 'Succès', message: 'Plat créé avec succès', data: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({ status: 'Erreur', message: 'Données invalides', errors: err.errors });
    }
    console.error(err);
    return res.status(400).json({ status: 'Erreur', message: 'Erreur lors de la création du plat', statusCode: 400 });
  }
};