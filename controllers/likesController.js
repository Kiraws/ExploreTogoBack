const prisma = require('../Libraries/prisma');

exports.addLike = async (req, res) => {
  const lieuId = parseInt(req.params.id, 10);
  const userId = req.userId;
  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({ status: 'Erreur', message: 'ID de lieu invalide', statusCode: 400 });
  }
  if (!userId) {
    return res.status(401).json({ status: 'Erreur', message: 'Utilisateur non authentifié', statusCode: 401 });
  }
  try {
    const check = await prisma.likes.findUnique({ where: { user_id_lieu_id: { user_id: userId, lieu_id: lieuId } } });
    if (check) {
      return res.status(409).json({ status: 'Erreur', message: 'Like déjà ajouté', statusCode: 409 });
    }
    const result = await prisma.likes.create({ data: { user_id: userId, lieu_id: lieuId } });
    return res.status(201).json({ status: 'Succès', message: 'Like ajouté avec succès', data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'Erreur', message: 'Erreur lors de l\'ajout du like', statusCode: 500 });
  }
};

exports.removeLike = async (req, res) => {
  const lieuId = parseInt(req.params.id, 10);
  const userId = req.userId;
  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({ status: 'Erreur', message: 'ID de lieu invalide', statusCode: 400 });
  }
  try {
    const result = await prisma.likes.deleteMany({ where: { user_id: userId, lieu_id: lieuId } });
    if (result.count === 0) {
      return res.status(404).json({ status: 'Erreur', message: 'Like non trouvé', statusCode: 404 });
    }
    return res.status(200).json({ status: 'Succès', message: 'Like supprimé avec succès' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'Erreur', message: 'Erreur lors de la suppression du like', statusCode: 500 });
  }
};