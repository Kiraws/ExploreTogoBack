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



// Récupérer la liste de tous les utilisateurs actifs
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        firstname: true,
        email: true,
        role: true
      }
    });

    if (!users || users.length === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Aucun utilisateur trouvé',
        statusCode: 404
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Liste des utilisateurs récupérée avec succès',
      data: users
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur serveur lors de la récupération des utilisateurs',
      statusCode: 500
    });
  }
};

// Désactiver un utilisateur (active = false)
exports.desactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID de l’utilisateur requis'
      });
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { active: false }
    });

    return res.status(200).json({
      success: true,
      message: 'Utilisateur désactivé avec succès',
      data: {
        ...user,
        id: user.id.toString() // si besoin pour éviter les BigInt
      }
    });
  } catch (error) {
    console.error('Erreur dans desactivateUser:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
};
