const prisma = require('../Libraries/prisma');

exports.addLike = async (req, res) => {
  const lieuId = parseInt(req.params.id, 10);
  const userId = req.user?.id;

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({ status: 'Erreur', message: 'ID de lieu invalide', statusCode: 400 });
  }

  if (!userId) {
    return res.status(401).json({ status: 'Erreur', message: 'Utilisateur non authentifié', statusCode: 401 });
  }

  try {
    const check = await prisma.likes.findUnique({
      where: {
        userId_lieuId: {
          userId,
          lieuId: BigInt(lieuId),
        },
      },
    });

    if (check) {
      return res.status(409).json({ status: 'Erreur', message: 'Like déjà ajouté', statusCode: 409 });
    }

    const result = await prisma.likes.create({
      data: {
        userId,
        lieuId: BigInt(lieuId),
      },
    });

    // 🟢 Conversion sécurisée des BigInt pour éviter l’erreur JSON
    const safeResult = JSON.parse(
      JSON.stringify(result, (_, value) => (typeof value === 'bigint' ? value.toString() : value))
    );

    return res.status(201).json({
      status: 'Succès',
      message: 'Like ajouté avec succès',
      data: safeResult,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: "Erreur lors de l'ajout du like",
      statusCode: 500,
    });
  }
};

exports.removeLike = async (req, res) => {
  const lieuId = parseInt(req.params.id, 10);
  const userId = req.user?.id;

  if (isNaN(lieuId) || lieuId <= 0) {
    return res.status(400).json({
      status: 'Erreur',
      message: 'ID de lieu invalide',
      statusCode: 400,
    });
  }

  if (!userId) {
    return res.status(401).json({
      status: 'Erreur',
      message: 'Utilisateur non authentifié',
      statusCode: 401,
    });
  }

  try {
    // ✅ Suppression en cohérence avec le schéma
    const result = await prisma.likes.deleteMany({
      where: {
        userId,
        lieuId: BigInt(lieuId),
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        status: 'Erreur',
        message: 'Like non trouvé',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: 'Succès',
      message: 'Like supprimé avec succès',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la suppression du like',
      statusCode: 500,
    });
  }
};

// 🟣 Récupérer tous les lieux likés par un utilisateur
exports.getLikedPlaces = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      status: 'Erreur',
      message: 'Utilisateur non authentifié',
      statusCode: 401,
    });
  }

  try {
    const likedPlaces = await prisma.likes.findMany({
      where: { userId },
      include: {
        lieu: true, // ✅ permet d’inclure les infos du lieu liké
      },
      orderBy: { createdAt: 'desc' },
    });

    const safeResult = JSON.parse(
      JSON.stringify(likedPlaces, (_, value) => (typeof value === 'bigint' ? value.toString() : value))
    );

    return res.status(200).json({
      status: 'Succès',
      message: 'Lieux likés récupérés avec succès',
      data: safeResult,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'Erreur',
      message: 'Erreur lors de la récupération des lieux likés',
      statusCode: 500,
    });
  }
};