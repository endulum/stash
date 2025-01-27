/*
  Warnings:

  - You are about to drop the column `supabaseUrl` on the `File` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "File" DROP COLUMN "supabaseUrl";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "storage" INTEGER NOT NULL DEFAULT 0;
