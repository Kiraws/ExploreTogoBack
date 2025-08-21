-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "public"."Genre" AS ENUM ('masculin', 'feminin');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('admin', 'utilisateur', 'gerant');

-- CreateEnum
CREATE TYPE "public"."ReservationStatus" AS ENUM ('en_attente', 'confirmee', 'annulee');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "firstname" VARCHAR(100) NOT NULL,
    "genre" "public"."Genre" NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'utilisateur',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lieu" (
    "id" BIGSERIAL NOT NULL,
    "etab_images" TEXT[],
    "region_nom" VARCHAR(50) NOT NULL,
    "prefecture_nom" VARCHAR(50) NOT NULL,
    "commune_nom" VARCHAR(50) NOT NULL,
    "canton_nom" VARCHAR(100) NOT NULL,
    "nom_localite" VARCHAR(100),
    "etab_nom" VARCHAR(255) NOT NULL,
    "etab_jour" TEXT[],
    "toilette_type" VARCHAR(50),
    "etab_adresse" VARCHAR(255),
    "type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "activite_statut" VARCHAR(50),
    "activite_categorie" VARCHAR(50),
    "etab_creation_date" VARCHAR(50),
    "geometry" geometry NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lieu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Images" (
    "id_image" BIGSERIAL NOT NULL,
    "lieu_id" BIGINT NOT NULL,
    "image_url" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Images_pkey" PRIMARY KEY ("id_image")
);

-- CreateTable
CREATE TABLE "public"."Notifications" (
    "id_notification" BIGSERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "typeNotification" VARCHAR(50) NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "Notifications_pkey" PRIMARY KEY ("id_notification")
);

-- CreateTable
CREATE TABLE "public"."Likes" (
    "id_like" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "lieu_id" BIGINT NOT NULL,

    CONSTRAINT "Likes_pkey" PRIMARY KEY ("id_like")
);

-- CreateTable
CREATE TABLE "public"."Loisirs" (
    "id" BIGINT NOT NULL,
    "etablissement_type" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Loisirs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Hotels" (
    "id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Parcs_Jardins" (
    "id" BIGINT NOT NULL,
    "terrain" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parcs_Jardins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Marches" (
    "id" BIGINT NOT NULL,
    "organisme" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Marches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Sites_Naturels" (
    "id" BIGINT NOT NULL,
    "type_site_deux" VARCHAR(50) NOT NULL,
    "ministere_tutelle" VARCHAR(50) NOT NULL,
    "religion" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sites_Naturels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Zones_Protegees" (
    "id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Zones_Protegees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Supermarches_Etablissement" (
    "id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supermarches_Etablissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Etablissement_Touristique" (
    "id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Etablissement_Touristique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reservations" (
    "id_reservation" BIGSERIAL NOT NULL,
    "status" "public"."ReservationStatus" NOT NULL DEFAULT 'en_attente',
    "date_reservation" DATE NOT NULL,
    "heure_reservation" TIME(6) NOT NULL,
    "nb_place" INTEGER NOT NULL,
    "user_contact" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "lieu_id" BIGINT NOT NULL,

    CONSTRAINT "Reservations_pkey" PRIMARY KEY ("id_reservation")
);

-- CreateTable
CREATE TABLE "public"."Menu" (
    "id_Menu" VARCHAR(50) NOT NULL,
    "nom_Menu" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loisir_id" BIGINT NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id_Menu")
);

-- CreateTable
CREATE TABLE "public"."Favorites" (
    "id_favorite" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lieu_id" BIGINT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "Favorites_pkey" PRIMARY KEY ("id_favorite")
);

-- CreateTable
CREATE TABLE "public"."CategoriePlat" (
    "idCategorie" VARCHAR(50) NOT NULL,
    "nom_Categorie" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_Menu" TEXT NOT NULL,

    CONSTRAINT "CategoriePlat_pkey" PRIMARY KEY ("idCategorie")
);

-- CreateTable
CREATE TABLE "public"."Plat" (
    "id_plat" BIGSERIAL NOT NULL,
    "nom_plat" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "prix" DECIMAL(10,2) NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idCategorie" TEXT NOT NULL,

    CONSTRAINT "Plat_pkey" PRIMARY KEY ("id_plat")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Likes_user_id_lieu_id_key" ON "public"."Likes"("user_id", "lieu_id");

-- CreateIndex
CREATE UNIQUE INDEX "Favorites_user_id_lieu_id_key" ON "public"."Favorites"("user_id", "lieu_id");

-- AddForeignKey
ALTER TABLE "public"."Images" ADD CONSTRAINT "Images_lieu_id_fkey" FOREIGN KEY ("lieu_id") REFERENCES "public"."Lieu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notifications" ADD CONSTRAINT "Notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Likes" ADD CONSTRAINT "Likes_lieu_id_fkey" FOREIGN KEY ("lieu_id") REFERENCES "public"."Lieu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Likes" ADD CONSTRAINT "Likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Loisirs" ADD CONSTRAINT "Loisirs_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."Lieu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Hotels" ADD CONSTRAINT "Hotels_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."Lieu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Parcs_Jardins" ADD CONSTRAINT "Parcs_Jardins_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."Lieu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Marches" ADD CONSTRAINT "Marches_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."Lieu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sites_Naturels" ADD CONSTRAINT "Sites_Naturels_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."Lieu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Zones_Protegees" ADD CONSTRAINT "Zones_Protegees_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."Lieu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Supermarches_Etablissement" ADD CONSTRAINT "Supermarches_Etablissement_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."Lieu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Etablissement_Touristique" ADD CONSTRAINT "Etablissement_Touristique_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."Lieu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservations" ADD CONSTRAINT "Reservations_lieu_id_fkey" FOREIGN KEY ("lieu_id") REFERENCES "public"."Lieu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservations" ADD CONSTRAINT "Reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Menu" ADD CONSTRAINT "Menu_loisir_id_fkey" FOREIGN KEY ("loisir_id") REFERENCES "public"."Loisirs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Favorites" ADD CONSTRAINT "Favorites_lieu_id_fkey" FOREIGN KEY ("lieu_id") REFERENCES "public"."Lieu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Favorites" ADD CONSTRAINT "Favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CategoriePlat" ADD CONSTRAINT "CategoriePlat_id_Menu_fkey" FOREIGN KEY ("id_Menu") REFERENCES "public"."Menu"("id_Menu") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Plat" ADD CONSTRAINT "Plat_idCategorie_fkey" FOREIGN KEY ("idCategorie") REFERENCES "public"."CategoriePlat"("idCategorie") ON DELETE RESTRICT ON UPDATE CASCADE;
