-- AlterTable
ALTER TABLE "Directory" ALTER COLUMN "updated" DROP NOT NULL,
ALTER COLUMN "updated" DROP DEFAULT;

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "updated" DROP NOT NULL,
ALTER COLUMN "updated" DROP DEFAULT;
