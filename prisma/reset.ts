import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ log: ['query'] });

async function main() {
  await prisma.folder.deleteMany()
  await prisma.file.deleteMany()
  const picturesFolder = await prisma.folder.create({
    data: { name: 'pictures', parentId: null, authorId: 1 }
  })
  await prisma.folder.createMany({
    data: [
      { name: 'my_pets', parentId: picturesFolder.id, authorId: 1 },
      { name: 'screenshots', parentId: picturesFolder.id, authorId: 1 }
    ]
  })
  const documentsFolder = await prisma.folder.create({
    data: { name: 'documents', parentId: null, authorId: 1 }
  })
  await prisma.folder.createMany({
    data: [
      { name: 'homework', parentId: documentsFolder.id, authorId: 1 },
      { name: 'logs', parentId: documentsFolder.id, authorId: 1 },
      { name: 'legal', parentId: documentsFolder.id, authorId: 1 }
    ]
  })
}

main()
  .catch(e => {
    console.error(e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });