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

## Lancement de l'application

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

### Utilisateurs

#### GET /api/users/:id
Récupérer un utilisateur par son ID

**En-tête :** `Authorization: Bearer <token>`  
**Réponses :** 200 OK, 404 Not Found, 401 Unauthorized

### Lieux et Loisirs

#### POST /api/lieux
Créer un nouveau lieu (y compris un loisir si type = "loisirs")

**En-tête :** `Authorization: Bearer <token>`  
**Corps de la requête :**
```json
{
  "region_nom": "Région du Nord",
  "prefecture_nom": "Sokodé",
  "canton_nom": "Kparata",
  "etab_nom": "Parc de la Liberté",
  "type": "loisirs",
  "geometry": "POINT(1.1667 9.7167)",
  "status": true,
  "etablissement_type": "Parc public"
}
```

**Réponses :** 201 Created, 400 Bad Request, 422 Unprocessable Entity

#### PUT /api/loisirs/:id
Mettre à jour un loisir existant

**En-tête :** `Authorization: Bearer <token>`  
**Corps de la requête :**
```json
{
  "etablissement_type": "Parc public avec piscine"
}
```

**Réponses :** 200 OK, 400 Bad Request, 404 Not Found, 422 Unprocessable Entity

#### GET /api/loisirs/:id
Récupérer un loisir avec tous ses champs

**En-tête :** `Authorization: Bearer <token>`  
**Réponses :** 200 OK, 404 Not Found, 401 Unauthorized

#### DELETE /api/lieu/:id
Supprimer définitivement un lieu et toutes ses données liées

**En-tête :** `Authorization: Bearer <token>`  
**Corps de la requête :** Aucun  
**Réponses :** 200 OK, 400 Bad Request, 404 Not Found, 500 Internal Server Error

**Note :** Cette action est **irréversible** et supprime automatiquement :
- Les données loisirs associées (si applicable)
- Les réservations liées
- Les menus, favoris, likes et images
- Le lieu lui-même

#### PATCH /api/lieu/:id/desactivate
Désactiver un lieu (suppression douce)

**En-tête :** `Authorization: Bearer <token>`  
**Corps de la requête :** Aucun  
**Réponses :** 200 OK, 400 Bad Request, 404 Not Found, 500 Internal Server Error

**Note :** **Recommandé en production**. Passe le statut à `false` tout en préservant les données pour audit et restauration éventuelle.

### Réservations

#### POST /api/reservations
Créer une nouvelle réservation

**En-tête :** `Authorization: Bearer <token>`  
**Corps de la requête :**
```json
{
  "date_reservation": "2025-08-10",
  "heure_reservation": "14:30",
  "nb_place": 2,
  "lieu_id": 1
}
```

**Réponses :** 201 Created, 400 Bad Request, 404 Not Found, 422 Unprocessable Entity

### Menus

#### POST /api/menus
Créer un nouveau menu

**En-tête :** `Authorization: Bearer <token>`  
**Corps de la requête :**
```json
{
  "nom_Menu": "Menu du jour",
  "description": "Menu spécial pour les loisirs",
  "loisir_id": 1
}
```

**Réponses :** 201 Created, 400 Bad Request, 404 Not Found, 422 Unprocessable Entity

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

## Tests

Pour exécuter les tests (si implémentés) :
```bash
npm test
```

Les tests utilisent Jest et Supertest et sont situés dans le répertoire `tests`.  
**Note :** Les tests ne sont pas encore implémentés dans ce projet. Ajoutez-les selon vos besoins.

## Dépannage

- Assurez-vous que PostgreSQL est en cours d'exécution
- Vérifiez que l'extension PostGIS est bien activée
- Contrôlez vos variables d'environnement dans le fichier `.env`
- Vérifiez que tous les ports nécessaires sont disponibles

## Licence

[Ajoutez ici la licence de votre choix]