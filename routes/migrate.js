// routes/migrate.js
const express = require('express');
const db = require('../libraries/Database');
const router = express.Router();

router.all('/', async (req, res) => {
  try {
    await db.query(`
      -- Supprimer les tables existantes dans l'ordre inverse pour respecter les contraintes de clés étrangères
      DROP TABLE IF EXISTS "Plat" CASCADE;
      DROP TABLE IF EXISTS "CategoriePlat" CASCADE;
      DROP TABLE IF EXISTS "Menu" CASCADE;
      DROP TABLE IF EXISTS "Favorites" CASCADE;
      DROP TABLE IF EXISTS "Reservations" CASCADE;
      DROP TABLE IF EXISTS "Etablissement_Touristique" CASCADE;
      DROP TABLE IF EXISTS "Supermarches_Etablissement" CASCADE;
      DROP TABLE IF EXISTS "Zones_Protegees" CASCADE;
      DROP TABLE IF EXISTS "Sites_Naturels" CASCADE;
      DROP TABLE IF EXISTS "Marches" CASCADE;
      DROP TABLE IF EXISTS "Parcs_Jardins" CASCADE;
      DROP TABLE IF EXISTS "Hotels" CASCADE;
      DROP TABLE IF EXISTS "Loisirs" CASCADE;
      DROP TABLE IF EXISTS "Likes" CASCADE;
      DROP TABLE IF EXISTS "Notifications" CASCADE;
      DROP TABLE IF EXISTS "Images" CASCADE;
      DROP TABLE IF EXISTS "Lieu" CASCADE;
      DROP TABLE IF EXISTS "Sessions" CASCADE;
      DROP TABLE IF EXISTS "User" CASCADE;

      -- Supprimer les types énumérés existants
      DROP TYPE IF EXISTS user_genre;
      DROP TYPE IF EXISTS user_role;
      DROP TYPE IF EXISTS reservation_status;

      -- Créer les types énumérés pour User
      CREATE TYPE user_genre AS ENUM ('masculin', 'feminin');
      CREATE TYPE user_role AS ENUM ('admin', 'utilisateur', 'gerant');

     -- Créer la table User avec une séquence auto-incrémentée
      CREATE TABLE "User" (
        id BIGINT GENERATED ALWAYS AS IDENTITY,
        name VARCHAR(100) NOT NULL,
        firstname VARCHAR(100) NOT NULL,
        genre user_genre,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role user_role NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        UNIQUE(email)
      );

      -- Créer la table Sessions
      CREATE TABLE "Sessions" (
        id BIGINT GENERATED ALWAYS AS IDENTITY,
        user_id BIGINT NOT NULL,
        token TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        PRIMARY KEY(id),
        FOREIGN KEY(user_id) REFERENCES "User"(id) ON DELETE CASCADE
      );


      -- Créer la table Lieu avec la colonne geometry (requiert l'extension PostGIS)
      CREATE TABLE "Lieu" (
        id BIGINT GENERATED ALWAYS AS IDENTITY,
        etab_images TEXT[],
        region_nom VARCHAR(50) NOT NULL,
        prefecture_nom VARCHAR(50) NOT NULL,
        commune_nom VARCHAR(50) NOT NULL,
        canton_nom VARCHAR(100) NOT NULL,
        nom_localite VARCHAR(100),
        etab_nom VARCHAR(255) NOT NULL,
        etab_jour VARCHAR(50)[],
        toilette_type VARCHAR(50),
        etab_adresse VARCHAR(255),
        type VARCHAR(50) NOT NULL,
        description TEXT,
        activite_statut VARCHAR(50),
        activite_categorie VARCHAR(50),
        etab_creation_date VARCHAR(50),
        geometry GEOMETRY NOT NULL, -- Type générique pour accepter POINT, POLYGON, MULTIPOLYGON
        status BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        CONSTRAINT chk_toilette_type CHECK (toilette_type IN ('Connectees au reseau', 'toilettes seches', 'Latrines a eau', 'WCs', 'Douches', 'Nsp')),
        CONSTRAINT chk_type CHECK (type IN ('loisirs', 'hotels', 'parcs', 'marches', 'sites', 'zones', 'supermarches', 'touristique')),
        CONSTRAINT chk_activite_statut CHECK (activite_statut IN ('construction achevée', 'Construction en Projet', 'Construit et Utilise', 'Néant')),
        CONSTRAINT chk_activite_categorie CHECK (activite_categorie IN ('Jardin ou parc public', 'Lieu de sport et loisir vert', 'autre', 'Decoration sur la voie publique', 'Vente electro-menager', 'Alimentation Générale', 'Commerce général', 'Supérette', 'Vente de matériaux de construction', 'Néant', 'Nsp'))
      );

      -- Créer la table Images
      CREATE TABLE "Images" (
        id_image BIGINT GENERATED ALWAYS AS IDENTITY,
        lieu_id BIGINT NOT NULL,
        image_url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id_image),
        FOREIGN KEY(lieu_id) REFERENCES "Lieu"(id) ON DELETE CASCADE
      );

      -- Créer la table Notifications
      CREATE TABLE "Notifications" (
        id_notification BIGINT GENERATED ALWAYS AS IDENTITY,
        message TEXT NOT NULL,
        typeNotification VARCHAR(50) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id BIGINT NOT NULL,
        PRIMARY KEY(id_notification),
        FOREIGN KEY(user_id) REFERENCES "User"(id) ON DELETE CASCADE
      );

      -- Créer la table Likes
      CREATE TABLE "Likes" (
        id_like BIGINT GENERATED ALWAYS AS IDENTITY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id BIGINT NOT NULL,
        lieu_id BIGINT NOT NULL,
        PRIMARY KEY(id_like),
        UNIQUE(user_id, lieu_id),
        FOREIGN KEY(user_id) REFERENCES "User"(id),
        FOREIGN KEY(lieu_id) REFERENCES "Lieu"(id)
      );
      -- Créer la table Loisirs
      CREATE TABLE "Loisirs" (
        id BIGINT,
        etablissement_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(id) REFERENCES "Lieu"(id) ON DELETE CASCADE
      );

      -- Créer la table Hotels
      CREATE TABLE "Hotels" (
        id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(id) REFERENCES "Lieu"(id) ON DELETE CASCADE
      );

      -- Créer la table Parcs_Jardins
      CREATE TABLE "Parcs_Jardins" (
        id BIGINT,
        terrain VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(id) REFERENCES "Lieu"(id) ON DELETE CASCADE
      );

      -- Créer la table Marches
      CREATE TABLE "Marches" (
        id BIGINT,
        organisme VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(id) REFERENCES "Lieu"(id) ON DELETE CASCADE
      );

      -- Créer la table Sites_Naturels
      CREATE TABLE "Sites_Naturels" (
        id BIGINT,
        type_site_deux VARCHAR(50),
        ministere_tutelle VARCHAR(50),
        religion VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(id) REFERENCES "Lieu"(id) ON DELETE CASCADE
      );

      -- Créer la table Zones_Protegees
      CREATE TABLE "Zones_Protegees" (
        id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(id) REFERENCES "Lieu"(id) ON DELETE CASCADE
      );

      -- Créer la table Supermarches_Etablissement
      CREATE TABLE "Supermarches_Etablissement" (
        id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(id) REFERENCES "Lieu"(id) ON DELETE CASCADE
      );

      -- Créer la table Etablissement_Touristique
      CREATE TABLE "Etablissement_Touristique" (
        id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(id) REFERENCES "Lieu"(id) ON DELETE CASCADE
      );

      -- Créer le type énuméré pour Reservations
      CREATE TYPE reservation_status AS ENUM ('en_attente', 'confirmee', 'annulee');

      -- Créer la table Reservations
      CREATE TABLE "Reservations" (
        id_reservation BIGINT GENERATED ALWAYS AS IDENTITY,
        status reservation_status NOT NULL DEFAULT 'en_attente',
        date_reservation DATE NOT NULL,
        heure_reservation TIME NOT NULL,
        nb_place INT NOT NULL CHECK(nb_place > 0),
        user_contact VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id BIGINT NOT NULL,
        lieu_id BIGINT NOT NULL,
        PRIMARY KEY(id_reservation),
        FOREIGN KEY(user_id) REFERENCES "User"(id),
        FOREIGN KEY(lieu_id) REFERENCES "Lieu"(id)
      );

      -- Créer la table Menu
      CREATE TABLE "Menu" (
        id_Menu VARCHAR(50),
        nom_Menu VARCHAR(100) NOT NULL,
        Description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        loisir_id BIGINT NOT NULL,
        PRIMARY KEY(id_Menu),
        FOREIGN KEY(loisir_id) REFERENCES "Loisirs"(id),
        CONSTRAINT chk_menu_uuid CHECK (id_Menu ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
      );

      -- Créer la table Favorites
      CREATE TABLE "Favorites" (
        id_favorite BIGINT GENERATED ALWAYS AS IDENTITY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lieu_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        PRIMARY KEY(id_favorite),
        UNIQUE(user_id, lieu_id),
        FOREIGN KEY(lieu_id) REFERENCES "Lieu"(id),
        FOREIGN KEY(user_id) REFERENCES "User"(id)
      );

      -- Créer la table CategoriePlat
      CREATE TABLE "CategoriePlat" (
        idCategorie VARCHAR(50),
        nom_Categorie VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        id_Menu VARCHAR(50) NOT NULL,
        PRIMARY KEY(idCategorie),
        FOREIGN KEY(id_Menu) REFERENCES "Menu"(id_Menu),
        CONSTRAINT chk_categorie_uuid CHECK (idCategorie ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
      );

      -- Créer la table Plat
      CREATE TABLE "Plat" (
        id_plat BIGINT GENERATED ALWAYS AS IDENTITY,
        nom_plat VARCHAR(100) NOT NULL,
        description TEXT,
        prix DECIMAL(10,2) NOT NULL,
        disponible BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        idCategorie VARCHAR(50) NOT NULL,
        PRIMARY KEY(id_plat),
        FOREIGN KEY(idCategorie) REFERENCES "CategoriePlat"(idCategorie)
      );
    `);

    res.status(201).json({
      message: 'Migration effectuée avec succès',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'Erreur',
      message: 'Échec de la migration',
      statusCode: 500,
      error: err.message,
    });
  }
});

module.exports = router;