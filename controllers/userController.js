const prisma = require('../Libraries/prisma');

exports.getUser = async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  try {
    const record = await prisma.user.findUnique({
      where: { id: parseInt(id), active: true },
      select: { id: true, name: true, firstname: true, email: true, role: true }
    });
    if (!record) {
      return res.status(404).json({ status: 'Erreur', message: 'Utilisateur non trouvé', statusCode: 404 });
    }
    return res.status(200).json({ status: 'Succès', message: 'Utilisateur récupéré avec succès', data: record });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ status: 'Erreur', message: 'Erreur client', statusCode: 400 });
  }
};