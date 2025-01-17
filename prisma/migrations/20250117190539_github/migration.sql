-- AlterTable
ALTER TABLE "User" ADD COLUMN     "githubId" INTEGER,
ADD COLUMN     "githubUser" VARCHAR(255),
ALTER COLUMN "password" DROP NOT NULL;
