import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ log: ['query'] });

async function main() {
  await prisma.directory.deleteMany()
  await prisma.file.deleteMany()
  const picturesDirectory = await prisma.directory.create({
    data: { name: 'pictures', parentId: null, authorId: 1 }
  })
  await prisma.directory.createMany({
    data: [
      { name: 'my_pets', parentId: picturesDirectory.id, authorId: 1 },
      { name: 'screenshots', parentId: picturesDirectory.id, authorId: 1 }
    ]
  })
  const documentsDirectory = await prisma.directory.create({
    data: { name: 'documents', parentId: null, authorId: 1 }
  })
  await prisma.directory.createMany({
    data: [
      { name: 'homework', parentId: documentsDirectory.id, authorId: 1 },
      { name: 'logs', parentId: documentsDirectory.id, authorId: 1 },
      { name: 'legal', parentId: documentsDirectory.id, authorId: 1 }
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