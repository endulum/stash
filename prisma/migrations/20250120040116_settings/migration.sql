/*
  Warnings:

  - You are about to drop the column `createdAt` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `File` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "FileSort" AS ENUM ('name', 'size', 'type', 'created', 'updated');

-- CreateEnum
CREATE TYPE "FileSortOrder" AS ENUM ('asc', 'desc');

-- CreateEnum
CREATE TYPE "DirSort" AS ENUM ('name', 'created', 'updated');

-- CreateEnum
CREATE TYPE "DirSortOrder" AS ENUM ('asc', 'desc');

-- AlterTable
ALTER TABLE "Directory" ADD COLUMN     "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "File" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
DROP COLUMN "url",
ADD COLUMN     "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "supabaseUrl" TEXT,
ADD COLUMN     "updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" SERIAL NOT NULL,
    "sortFiles" "FileSort" NOT NULL DEFAULT 'name',
    "sortFilesDirection" "FileSortOrder" NOT NULL DEFAULT 'asc',
    "sortDirs" "DirSort" NOT NULL DEFAULT 'name',
    "sortDirsDirection" "DirSortOrder" NOT NULL DEFAULT 'asc',
    "userId" INTEGER NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
