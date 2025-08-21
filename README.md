# API Node.js avec Express, PostgreSQL, JWT, Zod et bcrypt

Ce projet est une API RESTful construite avec Node.js, Express et PostgreSQL. Elle permet de gérer des utilisateurs, des lieux, des réservations, des menus, des loisirs, et inclut des fonctionnalités d'authentification sécurisée via JWT, une validation des données avec Zod, un hachage des mots de passe avec bcrypt, et une gestion des emails de réinitialisation via Mailtrap pour les tests.

## Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Configuration de la base de données](#configuration-de-la-base-de-données)
- [Lancement de l'application](#lancement-de-lapplication)
- [Endpoints de l'API](#endpoints-de-lapi)
- [Structure du projet](#structure-du-projet)
- [Tests](#tests)
- [Dépannage](#dépannage)
- [Licence](#licence)

## Fonctionnalités

- API RESTful avec Express
- Intégration avec une base de données PostgreSQL (avec support PostGIS pour les géométries)
- Authentification JWT avec génération de tokens
- Validation des données avec Zod
- Hachage sécurisé des mots de passe avec bcrypt
- Gestion des erreurs robuste
- Structure modulaire avec routes séparées et schémas de validation
- Support pour la gestion des utilisateurs, lieux, réservations, menus, loisirs, et réinitialisation de mot de passe
- Envoi d'emails de test via Mailtrap pour la réinitialisation de mot de passe
- Héritage entre les tables `Lieu` et `Loisirs` pour gérer les spécificités des lieux de type loisirs

## Prérequis

- Node.js (version 14 ou supérieure)
- PostgreSQL (version 13 ou supérieure recommandée) avec l'extension PostGIS activée
- npm (Node Package Manager)
- Un compte Mailtrap (inscription gratuite sur [mailtrap.io](https://mailtrap.io))

## Installation

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/votre-nom-utilisateur/votre-nom-de-dépôt.git
   cd votre-nom-de-dépôt
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Installez les dépendances supplémentaires :
   ```bash
   npm install nodemailer
   ```

## Configuration

Créez un fichier `.env` à la racine du projet et ajoutez les configurations suivantes :

```env
DB_HOST=localhost
DB_USER=votre_utilisateur_db
DB_PASSWORD=votre_mot_de_passe_db
DB_NAME=votre_nom_de_base_de_donnees
DB_PORT=5432
JWT_SECRET=votre_secret_jwt
JWT_EXPIRES_IN=1d
PORT=3030
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=ton-username-mailtrap
EMAIL_PASS=ton-password-mailtrap
```

**Note :** Remplacez `votre_utilisateur_db`, `votre_mot_de_passe_db`, `votre_nom_de_base_de_donnees`, `votre_secret_jwt`, `ton-username-mailtrap`, et `ton-password-mailtrap` par vos valeurs respectives. Les credentials Mailtrap sont disponibles dans votre tableau de bord après inscription.

## Configuration de la base de données

1. Assurez-vous que PostgreSQL est en cours d'exécution et que l'extension PostGIS est activée :
   ```sql
   CREATE EXTENSION postgis;
   ```

2. **(Optionnel)** Pour réinitialiser la base de données, supprimez toutes les tables dans l'ordre inverse des dépendances pour éviter les erreurs de contraintes de clés étrangères :

   ```sql
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
   DROP TABLE IF EXISTS "User" CASCADE;
   ```
   
   **Note :** Vérifiez les tables existantes avec `\dt` dans psql et ajustez l'ordre si nécessaire.

3. Lancez le serveur :
   ```bash
   npm run dev
   ```

4. Ouvrez un navigateur ou un outil comme Postman et effectuez une requête GET à :
   ```
   http://localhost:3030/migrate
   ```
   Cet endpoint créera toutes les tables nécessaires dans votre base de données PostgreSQL.


Lancez le serveur :
```bash
npm run dev
```

L'API sera accessible à `http://localhost:3030`.

## Endpoints de l'API

### Authentification

#### POST /auth/register
Créer un nouvel utilisateur

**Corps de la requête :**
```json
{
  "name": "Doe",
  "firstname": "John",
  "email": "john.doe@example.com",
  "password": "motdepasse123",
  "genre": "masculin",
  "role": "utilisateur"
}
```

**Réponses :** 201 Created, 400 Bad Request, 422 Unprocessable Entity (erreurs de validation)

#### POST /auth/login
Authentifier un utilisateur et obtenir un token JWT

**Corps de la requête :**
```json
{
  "email": "john.doe@example.com",
  "password": "motdepasse123"
}
```

**Réponses :** 200 OK, 401 Unauthorized, 422 Unprocessable Entity

#### POST /auth/logout
Déconnecter un utilisateur

**En-tête :** `Authorization: Bearer <token>`  
**Corps de la requête :** Aucun  
**Réponses :** 200 OK, 400 Bad Request

#### POST /auth/forgot-password
Demander une réinitialisation de mot de passe

**Corps de la requête :**
```json
{ "email": "john.doe@example.com" }
```

**Réponses :** 200 OK (email envoyé à Mailtrap), 404 Not Found, 422 Unprocessable Entity

#### POST /auth/reset-password
Réinitialiser le mot de passe avec un token

**Corps de la requête :**
```json
{ 
  "token": "le-token-recu-de-mailtrap", 
  "newPassword": "nouveau-mot-de-passe123" 
}
```

**Réponses :** 200 OK, 400 Bad Request, 404 Not Found, 422 Unprocessable Entity

#### PUT /auth/update-profile
Mettre à jour les informations du profil utilisateur

**En-tête :** `Authorization: Bearer <token>`  
**Corps de la requête :**
```json
{
  "name": "Nouveau Nom",
  "firstname": "Nouveau Prénom",
  "genre": "masculin",
  "email": "nouveau@email.com",
  "currentPassword": "motDePasseActuel",
  "newPassword": "nouveauMotDePasse123"
}
```

**Champs optionnels :** Tous les champs sont optionnels, seuls les champs fournis seront mis à jour  
**Sécurité :** `currentPassword` requis pour modifier `email` ou `newPassword`  
**Réponses :** 200 OK, 400 Bad Request, 401 Unauthorized, 409 Conflict, 422 Unprocessable Entity

#### GET /auth/profile
Récupérer les informations du profil utilisateur connecté

**En-tête :** `Authorization: Bearer <token>`  
**Corps de la requête :** Aucun  
**Réponses :** 200 OK, 404 Not Found, 401 Unauthorized, 500 Internal Server Error

#### DELETE /auth/delete-account
Supprimer un compte utilisateur

**En-tête :** `Authorization: Bearer <token>`  
**Corps de la requête :** Aucun  
**Réponses :** 200 OK, 401 Unauthorized, 404 Not Found

---

### Utilisateurs

#### GET /api/users/:id
Récupérer un utilisateur par son ID

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID de l'utilisateur  
**Réponses :** 200 OK, 404 Not Found, 401 Unauthorized

---

### Lieux

#### POST /api/lieux
Créer un nouveau lieu (avec support automatique des loisirs)

**En-tête :** `Authorization: Bearer <token>`  
**Corps de la requête :**
```json
{
  "region_nom": "Maritime",
  "prefecture_nom": "Lome",
  "canton_nom": "Golfe 1",
  "nom_localite": "Kodjoviakope",
  "etab_nom": "Parc de la Liberté",
  "etab_jour": ["lundi", "mardi", "mercredi"],
  "toilette_type": "WCs",
  "etab_adresse": "Rue des Palmiers",
  "type": "loisirs",
  "activite_statut": "Construit et Utilise",
  "activite_categorie": "Lieu de sport et loisir vert",
  "etab_creation_date": "2023-01-15",
  "geometry": "POINT(1.2167 6.1319)",
  "status": true,
  "etablissement_type": "Parc public"
}
```

**Note :** Si `type = "loisirs"` et `etablissement_type` fourni, un enregistrement sera automatiquement créé dans la table Loisirs  
**Réponses :** 201 Created, 400 Bad Request, 422 Unprocessable Entity

#### DELETE /api/lieu/:id
Supprimer un lieu (avec gestion automatique des données liées)

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du lieu  
**Note :** Supprime automatiquement les réservations, menus, favoris, likes et images liés  
**Réponses :** 200 OK, 404 Not Found, 500 Internal Server Error

#### PATCH /api/lieu/:id/desactivate
Désactivation douce d'un lieu (suppression douce)

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du lieu  
**Réponses :** 200 OK, 404 Not Found, 500 Internal Server Error

---

### Loisirs

#### GET /api/loisirs/:id
Récupérer un loisir avec toutes ses informations

**Paramètres :** `id` - ID du loisir  
**Réponses :** 200 OK, 404 Not Found, 400 Bad Request, 500 Internal Server Error

#### PUT /api/loisirs/:id
Mettre à jour un loisir existant

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du loisir  
**Corps de la requête :**
```json
{
  "region_nom": "Nouvelle région",
  "etab_nom": "Nouveau nom",
  "geometry": "POINT(1.5 6.5)",
  "status": true,
  "etablissement_type": "Restaurant"
}
```

**Note :** Met à jour les tables Lieu et Loisirs dans une transaction  
**Réponses :** 200 OK, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

---

### Hôtels

#### GET /api/hotels/:id
Récupérer un hôtel avec toutes ses informations

**Paramètres :** `id` - ID de l'hôtel  
**Réponses :** 200 OK, 404 Not Found, 400 Bad Request, 500 Internal Server Error

#### PUT /api/hotels/:id
Mettre à jour un hôtel existant

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID de l'hôtel  
**Corps de la requête :**
```json
{
  "etab_nom": "Grand Hôtel du Golfe",
  "toilette_type": "WCs",
  "status": true
}
```

**Réponses :** 200 OK, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

---

### Parcs et Jardins

#### GET /api/parcs-jardins/:id
Récupérer un parc ou jardin avec toutes ses informations

**Paramètres :** `id` - ID du parc/jardin  
**Réponses :** 200 OK, 404 Not Found, 400 Bad Request, 500 Internal Server Error

#### PUT /api/parcs-jardins/:id
Mettre à jour un parc ou jardin existant

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du parc/jardin  
**Corps de la requête :**
```json
{
  "etab_nom": "Parc National de la Paix",
  "terrain": "Sable",
  "status": true
}
```

**Réponses :** 200 OK, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

---

### Marchés

#### GET /api/marches/:id
Récupérer un marché avec toutes ses informations

**Paramètres :** `id` - ID du marché  
**Réponses :** 200 OK, 404 Not Found, 400 Bad Request, 500 Internal Server Error

#### PUT /api/marches/:id
Mettre à jour un marché existant

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du marché  
**Corps de la requête :**
```json
{
  "etab_nom": "Grand Marché Central",
  "organisme": "Municipalité",
  "status": true
}
```

**Réponses :** 200 OK, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

---

### Sites Naturels

#### GET /api/sites-naturels/:id
Récupérer un site naturel avec toutes ses informations

**Paramètres :** `id` - ID du site naturel  
**Réponses :** 200 OK, 404 Not Found, 400 Bad Request, 500 Internal Server Error

#### PUT /api/sites-naturels/:id
Mettre à jour un site naturel existant

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du site naturel  
**Corps de la requête :**
```json
{
  "etab_nom": "Cascade de Kpalimé",
  "type_site_deux": "Cascade",
  "ministere_tutelle": "Environnement",
  "religion": "Néant"
}
```

**Réponses :** 200 OK, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

---

### Zones Protégées

#### GET /api/zones-protegees/:id
Récupérer une zone protégée avec toutes ses informations

**Paramètres :** `id` - ID de la zone protégée  
**Réponses :** 200 OK, 404 Not Found, 400 Bad Request, 500 Internal Server Error

#### PUT /api/zones-protegees/:id
Mettre à jour une zone protégée existante

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID de la zone protégée  
**Corps de la requête :**
```json
{
  "etab_nom": "Parc National de Fazao",
  "status": true
}
```

**Réponses :** 200 OK, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

---

### Supermarchés Établissement

#### GET /api/supermarches-etablissement/:id
Récupérer un supermarché établissement avec toutes ses informations

**Paramètres :** `id` - ID du supermarché  
**Réponses :** 200 OK, 404 Not Found, 400 Bad Request, 500 Internal Server Error

#### PUT /api/supermarches-etablissement/:id
Mettre à jour un supermarché établissement existant

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du supermarché  
**Corps de la requête :**
```json
{
  "etab_nom": "Carrefour Lomé",
  "status": true
}
```

**Réponses :** 200 OK, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

---

### Établissements Touristiques

#### GET /api/etablissements-touristiques/:id
Récupérer un établissement touristique avec toutes ses informations

**Paramètres :** `id` - ID de l'établissement touristique  
**Réponses :** 200 OK, 404 Not Found, 400 Bad Request, 500 Internal Server Error

#### PUT /api/etablissements-touristiques/:id
Mettre à jour un établissement touristique existant

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID de l'établissement touristique  
**Corps de la requête :**
```json
{
  "etab_nom": "Musée National",
  "status": true
}
```

**Réponses :** 200 OK, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

---

### Réservations

#### POST /api/reservations
Créer une nouvelle réservation

**En-tête :** `Authorization: Bearer <token>`  
**Corps de la requête :**
```json
{
  "lieu_id": 1,
  "date_reservation": "2024-12-25",
  "heure_reservation": "14:30:00",
  "nb_place": 4,
  "user_contact": "+228 12 34 56 78",
  "status": "en_attente"
}
```

**Réponses :** 201 Created, 404 Not Found, 422 Unprocessable Entity, 400 Bad Request

#### GET /api/reservations/:id
Récupérer une réservation spécifique par ID

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID de la réservation  
**Note :** Seul le propriétaire de la réservation peut la consulter  
**Réponses :** 200 OK, 404 Not Found, 400 Bad Request, 500 Internal Server Error

#### PUT /api/reservations/:id
Mettre à jour une réservation

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID de la réservation  
**Corps de la requête :**
```json
{
  "status": "confirmee",
  "nb_place": 6,
  "heure_reservation": "16:00:00"
}
```

**Réponses :** 200 OK, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

#### DELETE /api/reservations/:id
Annuler (supprimer) une réservation

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID de la réservation  
**Réponses :** 200 OK, 404 Not Found, 500 Internal Server Error

#### GET /api/users/:userId/reservations
Lister toutes les réservations d'un utilisateur

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `userId` - ID de l'utilisateur  
**Note :** Un utilisateur ne peut voir que ses propres réservations  
**Réponses :** 200 OK, 403 Forbidden, 500 Internal Server Error

---

### Menus et Plats

#### POST /api/loisirs/:id/menus
Créer un nouveau menu pour un loisir

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du loisir  
**Corps de la requête :**
```json
{
  "id_Menu": "550e8400-e29b-41d4-a716-446655440000",
  "nom_Menu": "Menu Traditionnel",
  "Description": "Plats traditionnels togolais"
}
```

**Réponses :** 201 Created, 404 Not Found, 422 Unprocessable Entity, 400 Bad Request

#### GET /api/loisirs/:id/menus
Récupérer les menus d'un loisir

**Paramètres :** `id` - ID du loisir  
**Réponses :** 200 OK, 400 Bad Request, 500 Internal Server Error

#### POST /api/menus/:menuId/categories
Créer une catégorie de plat pour un menu

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `menuId` - UUID du menu  
**Corps de la requête :**
```json
{
  "idCategorie": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "nom_Categorie": "Entrées",
  "description": "Plats d'entrée variés"
}
```

**Réponses :** 201 Created, 404 Not Found, 422 Unprocessable Entity, 400 Bad Request

#### POST /api/categories/:categorieId/plats
Créer un plat dans une catégorie

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `categorieId` - UUID de la catégorie  
**Corps de la requête :**
```json
{
  "nom_plat": "Fufu aux épinards",
  "description": "Plat traditionnel togolais",
  "prix": 2500.00,
  "disponible": true
}
```

**Réponses :** 201 Created, 404 Not Found, 422 Unprocessable Entity, 400 Bad Request

#### GET /api/categories/:categorieId/plats
Récupérer tous les plats d'une catégorie

**Paramètres :** `categorieId` - UUID de la catégorie  
**Réponses :** 200 OK, 404 Not Found, 500 Internal Server Error

#### PUT /api/plats/:id
Mettre à jour un plat

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du plat  
**Corps de la requête :**
```json
{
  "nom_plat": "Fufu amélioré",
  "prix": 3000.00,
  "disponible": false
}
```

**Réponses :** 200 OK, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

#### DELETE /api/plats/:id
Supprimer un plat

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du plat  
**Réponses :** 200 OK, 404 Not Found, 500 Internal Server Error

---

### Likes et Favoris

#### POST /api/lieux/:id/likes
Ajouter un like à un lieu

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du lieu  
**Réponses :** 201 Created, 409 Conflict (déjà liké), 400 Bad Request, 500 Internal Server Error

#### DELETE /api/lieux/:id/likes
Supprimer un like

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du lieu  
**Réponses :** 200 OK, 404 Not Found, 500 Internal Server Error

#### POST /api/lieux/:id/favorites
Ajouter un lieu aux favoris

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du lieu  
**Réponses :** 201 Created, 409 Conflict (déjà en favoris), 400 Bad Request, 500 Internal Server Error

#### DELETE /api/lieux/:id/favorites
Supprimer un lieu des favoris

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du lieu  
**Réponses :** 200 OK, 404 Not Found, 500 Internal Server Error

#### GET /api/users/:userId/favorites
Lister les favoris d'un utilisateur

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `userId` - ID de l'utilisateur  
**Note :** Un utilisateur ne peut voir que ses propres favoris  
**Réponses :** 200 OK, 403 Forbidden, 500 Internal Server Error

---

### Notifications

#### POST /api/notifications
Créer une notification

**En-tête :** `Authorization: Bearer <token>`  
**Corps de la requête :**
```json
{
  "message": "Votre réservation a été confirmée",
  "typeNotification": "reservation",
  "user_id": 123
}
```

**Note :** Si `user_id` n'est pas fourni, la notification sera créée pour l'utilisateur connecté  
**Réponses :** 201 Created, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

#### PATCH /api/notifications/:id/read
Marquer une notification comme lue

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID de la notification  
**Réponses :** 200 OK, 404 Not Found, 500 Internal Server Error

#### GET /api/users/:userId/notifications
Récupérer les notifications d'un utilisateur

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `userId` - ID de l'utilisateur  
**Note :** Un utilisateur ne peut voir que ses propres notifications  
**Réponses :** 200 OK, 403 Forbidden, 500 Internal Server Error

---

### Images

#### POST /api/lieux/:id/images
Ajouter une image à un lieu

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID du lieu  
**Corps de la requête :**
```json
{
  "image_url": "https://exemple.com/image.jpg"
}
```

**Réponses :** 201 Created, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

#### GET /api/lieux/:id/images
Récupérer les images d'un lieu

**Paramètres :** `id` - ID du lieu  
**Réponses :** 200 OK, 400 Bad Request, 500 Internal Server Error

#### DELETE /api/images/:id
Supprimer une image

**En-tête :** `Authorization: Bearer <token>`  
**Paramètres :** `id` - ID de l'image  
**Réponses :** 200 OK, 404 Not Found, 500 Internal Server Error

---

## Données de test pour les API

Voici des exemples de données que vous pouvez utiliser pour tester les différentes API.

### 1. Création d'un utilisateur
```json
{
  "name": "Dupont",
  "firstname": "Jean",
  "genre": "masculin",
  "email": "jean.dupont@example.com",
  "password": "MotDePasse123",
  "role": "utilisateur"
}
```

### 2. Création d'un lieu de type Loisirs
```json
{
    "regionNom": "Lomé",
    "prefectureNom": "Golfe",
    "communeNom": "Commune Loisirs",
    "cantonNom": "Lomé-Carrefour",
    "etabNom": "Parc de la Cité",
    "etabJour": [
        "lundi",
        "mardi",
        "mercredi",
        "jeudi",
        "vendredi"
    ],
    "etabAdresse": "Rue de la Cité",
    "type": "loisirs",
    "geometry": "POINT(1.23456 6.78901)",
    "status": true,
    "etablissementType": "Parc public"
}
```

### 3. Création d'un hôtel
```json
{
    "regionNom": "Lomé",
    "prefectureNom": "Golfe",
    "communeNom": "Commune Hotel",
    "cantonNom": "Lomé-Carrefour",
    "nomLocalite": "Agoe",
    "etabNom": "Hôtel du Lac",
    "toiletteType": "Nsp",
    "type": "hotels",
    "geometry": "POINT(1.23456 6.78901)",
    "status": true
}

```

### 4. Création d'un parc
```json
{
    "regionNom": "Lomé",
    "prefectureNom": "Golfe",
    "communeNom": "Commune Parc",
    "cantonNom": "Lomé-Carrefour",
    "nomLocalite": "Agoe",
    "etabNom": "Parc National",
    "etabJour": [
        "mardi",
        "jeudi",
        "samedi"
    ],
    "toiletteType": "WCs",
    "etabAdresse": "Rue du Parc",
    "type": "parcs",
    "activiteStatut": "Construit et Utilise",
    "activiteCategorie": "Jardin ou parc public",
    "geometry": "POINT(1.23456 6.78901)",
    "status": true,
    "terrain": "mouille"
}

```

### 5. Création d'un marché
```json
{
    "regionNom": "Lomé",
    "prefectureNom": "Golfe",
    "communeNom": "Commune Marché",
    "cantonNom": "Lomé-Carrefour",
    "nomLocalite": "Agoe",
    "etabNom": "Marché Central",
    "etabJour": ["lundi", "mercredi", "vendredi", "dimanche"],
    "type": "marches",
    "geometry": "MULTIPOLYGON (((1.163437915407828 6.2172876530162045, 1.1637067235937115 6.217401180876223, 1.1638402492285291 6.217144433219377, 1.1636786129337497 6.2170081997179105, 1.1635117058902276 6.217147926385619, 1.163437915407828 6.2172876530162045)))",
    "status": true,
    "organisme": "Non"
}
```

### 6. Création d'un site naturel
```json
{
    "regionNom": "Lomé",
    "prefectureNom": "Golfe",
    "communeNom": "Commune Site",
    "cantonNom": "Lomé-Carrefour",
    "nomLocalite": "Agoe",
    "etabNom": "Cascade de la Paix",
    "etabJour": ["lundi", "mardi", "mercredi", "dimanche"],
    "etabAdresse": "Rue de la Nature",
    "type": "sites",
    "geometry": "POLYGON ((1.223154527547324 6.118307122542037, 1.2232763610781885 6.1182614349679625, 1.223377889020575 6.12177937817167, 1.2232662082839494 6.121804760157267, 1.2231646803415626 6.118317275336275, 1.223154527547324 6.118307122542037))",
    "status": true,
    "typeSiteDeux": "Cascade",
    "ministereTutelle": "Ministère de l'Environnement",
    "religion": "Néant"
}
```

### 7. Création d'une zone protégée
```json
{
    "regionNom": "Lomé",
    "prefectureNom": "Golfe",
    "communeNom": "Commune Zone",
    "cantonNom": "Lomé-Carrefour",
    "nomLocalite": "Agoe",
    "etabNom": "Réserve Naturelle",
    "type": "zones",
    "etabCreationDate": "2025-01-05",
    "geometry": "MULTIPOLYGON (((0.6402866912649157 7.598392552226026, 0.6507331470136135 7.594887004299956, 0.6563176188678445 7.587136505675209, 0.6568918915589389 7.585170995256224, 0.6139297197511815 7.424091506943052, 0.6085951285111206 7.4256136737699565, 0.6074459346395865 7.432918728931113, 0.6010994149904708 7.4572551426625715, 0.5959536595939284 7.464759914890751, 0.600989448864586 7.477415746316092, 0.6027142348310639 7.4867303051375504, 0.604864782491395 7.499370475980749, 0.6079761816032607 7.511357464746753, 0.6089782438227826 7.514103820412479, 0.608900974331154 7.5282139287072445, 0.6075325173036067 7.536632154576597, 0.6008412997159769 7.551111999591662, 0.602032192454366 7.556498782612563, 0.6026974785797907 7.5606742457145675, 0.6048284190389598 7.562394839993311, 0.6037389738479011 7.565877823731843, 0.6051492875758616 7.569701787029567, 0.606272005790954 7.572154874788852, 0.6077055972793381 7.57246115806724, 0.6086482697745277 7.575032618449132, 0.6097108833814089 7.577545057833325, 0.610782391681309 7.5784461584629765, 0.6107741638671513 7.579938139704646, 0.612861672792738 7.580964179720518, 0.6135208216325034 7.5807290722192615, 0.6141687926430569 7.582523062810372, 0.6237935582056722 7.5832322601439435, 0.6402866912649157 7.598392552226026)))",
    "status": true
}
```

### 8. Création d'un supermarché
```json
{
    "regionNom": "Lomé",
    "prefectureNom": "Golfe",
    "communeNom": "Commune Supermarché",
    "cantonNom": "Lomé-Carrefour",
    "nomLocalite": "Agoe",
    "etabNom": "Supermarché Central",
    "etabJour": ["dimanche", "vendredi"],
    "toiletteType": "WCs",
    "etabAdresse": "Rue du Commerce",
    "type": "supermarches",
    "activiteStatut": "Construit et Utilise",
    "activiteCategorie": "Commerce général",
    "etabCreationDate": "2025-01-08",
    "geometry": "POINT (1.4093421681262317 8.683129969667375)",
    "status": false
}
```

### 9. Création d'un établissement touristique
```json
{
    "regionNom": "Lomé",
    "prefectureNom": "Golfe",
    "communeNom": "Commune Touristique",
    "cantonNom": "Lomé-Carrefour",
    "nomLocalite": "Agoe",
    "etabNom": "Musée National",
    "etabJour": ["lundi"],
    "etabAdresse": "Rue du Patrimoine",
    "type": "touristique",
    "geometry": "POINT (1.1971746675213817 6.225493561195468)",
    "status": false
}
```

### 10. Création d'une réservation
```json
{
  "lieu_id": 1,
  "date": "2025-08-15",
  "heure": "14:00",
  "nb_personnes": 4,
  "nom_contact": "Dupont",
  "telephone": "+228 90 123 456",
  "email": "jean.dupont@example.com",
  "message": "Réservation pour un groupe familial"
}
```

### 11. Création d'un menu
```json
{
  "loisir_id": 1,
  "nom": "Menu spécial",
  "description": "Menu complet avec entrée, plat et dessert",
  "prix": 15000,
  "disponible": true
}
```

### 12. Création d'une catégorie de plat
```json
{
  "nom": "Plats traditionnels",
  "description": "Spécialités togolaises"
}
```

### 13. Création d'un plat
```json
{
  "categorie_id": 1,
  "nom": "Fufu aux poissons",
  "description": "Fufu servi avec une sauce aux poissons frais",
  "prix": 5000,
  "disponible": true
}
```

### 14. Création d'une notification
```json
{
  "message": "Nouvelle réservation reçue",
  "typeNotification": "reservation",
  "user_id": 1
}
```

### 15. Création d'une image
```json
{
  "lieu_id": 1,
  "image_url": "https://example.com/images/parc.jpg"
}
```

### Notes importantes
1. Les coordonnées géographiques (geometry) doivent être au format WKT (Well-Known Text)
2. Les dates doivent être au format ISO (YYYY-MM-DD)
3. Les heures doivent être au format HH:MM
4. Les tableaux doivent être au format JSON valide
5. Les types de toilettes doivent être parmi : "Connectees au reseau", "toilettes seches", "Latrines a eau", "WCs", "Douches", "Nsp"
6. Les types de lieux doivent être parmi : "loisirs", "hotels", "parcs", "marches", "sites", "zones", "supermarches", "touristique"

Ces exemples peuvent être utilisés avec des outils comme Postman ou curl pour tester les différentes API. Assurez-vous de respecter les types de données spécifiés dans chaque schéma.

## Gestion d'erreurs

Toutes les réponses d'erreur suivent le format suivant :

```json
{
  "status": "Erreur",
  "message": "Description de l'erreur",
  "statusCode": 400,
  "errors": [] // Optionnel, pour les erreurs de validation
}
```

### Codes d'erreur courants

- **400** - Requête incorrecte (Bad Request)
- **401** - Non authentifié (Unauthorized)
- **403** - Accès refusé (Forbidden)
- **404** - Ressource non trouvée (Not Found)
- **409** - Conflit (Conflict) - Ex: email déjà utilisé
- **422** - Entité non traitable (Unprocessable Entity) - Erreurs de validation
- **500** - Erreur interne du serveur (Internal Server Error)

---

## Formats de données

### Dates
- **Dates :** Format `YYYY-MM-DD` (ex: "2024-12-25")
- **Heures :** Format `HH:MM:SS` (ex: "14:30:00")
- **Timestamps :** ISO 8601 (ex: "2024-12-25T14:30:00.000Z")

### Géométrie
- **Points :** Format WKT `POINT(longitude latitude)` (ex: "POINT(1.2167 6.1319)")
- **Polygones :** Format WKT `POLYGON((...))` supporté

### Tableaux
- **Jours de la semaine :** `["lundi", "mardi", "mercredi"]`
- **PostgreSQL Arrays :** Automatiquement convertis depuis/vers JSON

---

## Migration de base de données

Pour initialiser ou réinitialiser la base de données :

```bash
curl -X GET http://localhost:3030/migrate
```

⚠️ **Attention :** Cette opération supprime toutes les données existantes !

## Structure du projet

```
ExploreTogoBack/
├── libraries/
│   ├── Database.js
│   └── JWT.js
├── middleware/
│   └── authMiddleware.js
├── routes/
│   ├── api.js
│   ├── auth.js
│   └── migrate.js
├── schemas/
│   ├── apiSchema.js
│   └── userSchema.js
├── .env
├── server.js
└── package.json
```
