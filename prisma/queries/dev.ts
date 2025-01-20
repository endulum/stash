import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { client } from "../client";

import * as fakes from "../fakes";

const testPassword = async () => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash("password", salt);
};

export async function truncateTable(tableName: string) {
  const query = `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`;
  await client.$queryRaw`${Prisma.raw(query)}`;
}

export async function createAdmin() {
  // ONLY the admin account is allowed to take #1.
  const firstUser = await client.user.findUnique({
    where: { id: 1 },
  });

  if (firstUser !== null) {
    if (firstUser.username === "admin" && firstUser.role === "ADMIN")
      return firstUser; // do nothing if an admin already exists

    await client.user.deleteMany({
      where: { OR: [{ username: "admin" }, { role: "ADMIN" }] },
    }); // erase any "partial" admins just in case

    // increment existing user ids by 1
    const usersToUpdate = await client.user.findMany({
      orderBy: { id: "desc" },
    });

    await client.$transaction([
      ...usersToUpdate.map((row) =>
        client.user.update({
          where: { id: row.id },
          data: { id: { increment: 1 } },
        })
      ),
    ]);
  }

  const admin = await client.user.create({
    data: {
      username: "admin",
      password: await testPassword(),
      role: "ADMIN",
      id: 1,
    },
  });

  await client.userSettings.create({
    data: { userId: 1 },
  });

  // since the id is manually set, we need to prevent unique constraint error
  await client.$executeRawUnsafe(
    "SELECT setval(pg_get_serial_sequence('\"User\"', 'id'), coalesce(max(id)+1, 1), false) FROM \"User\";"
  );
  // https://github.com/prisma/prisma/discussions/5256#discussioncomment-1191352

  return admin;
}

export async function wipe() {
  await truncateTable("User");
  await truncateTable("Session");
  await createAdmin();
}

export async function createBulkDirectories(
  count: number,
  authorId: number
): Promise<Item[]> {
  const items: Item[] = [];
  const directoryData = fakes.bulkDirectories(count);
  const parentIds: Array<string | null> = [null];
  for (const dir of directoryData) {
    const { id } = await client.directory.create({
      data: {
        ...dir,
        authorId,
        parentId: parentIds[Math.floor(Math.random() * parentIds.length)],
        created: dir.created,
      },
    });
    parentIds.push(id);
    items.push({ id, name: dir.name });
  }
  return items;
}

type Item = { id: string; name: string };

export async function createBulkFiles(
  count: number,
  authorId: number,
  directoryId?: string | null
): Promise<Item[]> {
  const items: Item[] = [];
  const fileData = fakes.bulkFiles(count);
  await Promise.all(
    fileData.map(async (file) => {
      const { id } = await client.file.create({
        data: {
          ...file,
          authorId,
          directoryId: directoryId ?? null,
          created: file.created,
        },
      });
      items.push({ id, name: file.name });
    })
  );
  return items;
}

export async function populateDirectories(
  lowerCount: number,
  upperCount: number,
  authorId: number,
  directoryIds: Array<string | null>
): Promise<Item[]> {
  const items: Item[] = [];
  await Promise.all(
    directoryIds.map(async (id) => {
      const bulkFileItems = await createBulkFiles(
        Math.floor(Math.random() * (upperCount - lowerCount)) + lowerCount,
        authorId,
        id
      );
      items.push(...bulkFileItems);
    })
  );
  return items;
}

export async function seedStash({
  authorId,
  directories,
  files,
}: {
  authorId: number;
  directories: number;
  files: { min: number; max: number };
}) {
  const directoryItems = await createBulkDirectories(directories, authorId);
  const fileItems = await populateDirectories(files.min, files.max, authorId, [
    null,
    ...directoryItems.map((dir) => dir.id),
  ]);
  return { directoryItems, fileItems };
}
