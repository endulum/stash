import {
  type Directory,
  type File,
  type Prisma,
  type UserSettings,
} from "@prisma/client";

import { client } from "../client";
import { findPath as findDirPath } from "./directory";

export async function find(id: string, authorId?: number) {
  return await client.file.findFirst({
    where: { id, ...(authorId && { authorId }) },
    include: {
      directory: true,
    },
  });
}

// for GET /dir/root, and for buildZip
export async function findFilesAtDir(
  directoryId: string | null,
  authorId: number,
  settings?: UserSettings | null
) {
  return await client.file.findMany({
    where: {
      directoryId,
      ...(authorId && { authorId }),
    },
    ...(settings && {
      orderBy: { [settings.sortFiles]: settings.sortFilesDirection },
    }),
  });
}

// assists in directory path component
export async function findPath(
  file: Prisma.FileGetPayload<{ include: { directory: true } }>
) {
  return await findDirPath(file.directory);
}

// assists in determining if a directory is a descendant of a shared directory
export async function trimPath(
  startingFile: Prisma.FileGetPayload<{ include: { directory: true } }>,
  endingDirId: string | null
) {
  const path = await findPath(startingFile);
  while (path.length > 0) {
    const p = path.shift();
    if (!p || p.id === endingDirId) break;
  }
  return path;
}

// assists in preventing similarly-named items at same location
export async function findNamedDuplicate(
  name: string,
  directoryId: string | null
) {
  return await client.file.findFirst({
    where: { name, directoryId },
  });
}

export async function edit(
  id: string,
  body: {
    name?: string;
    location?: string;
  }
) {
  await client.file.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.location && {
        directoryId: body.location === "home" ? null : body.location,
      }),
      updated: new Date(),
    },
  });
}

export async function del(id: string) {
  const { authorId, size } = await client.file.delete({ where: { id } });
  await client.user.update({
    where: { id: authorId },
    data: { storage: { decrement: size } },
  });
}

// convenience for making path strings
export async function getPathString(
  file: Prisma.FileGetPayload<{ include: { directory: true } }>
) {
  const path = await findPath(file);
  return (
    (path.length > 0 ? "/" + path.map((loc) => loc.name).join("/") : "") +
    "/" +
    file.name +
    "." +
    file.ext
  );
}

// convenience for finding all file types a user has
export async function getUniqueTypes(authorId: number) {
  return (
    await client.file.findMany({
      where: { authorId },
      distinct: ["type"],
      select: { type: true },
    })
  ).map((type) => type.type);
}

export async function search(authorId: number, params: Record<string, string>) {
  const results: (File | Directory)[] = [];
  const where = {
    authorId,
    ...(params.name && { name: { contains: params.name } }),
  };
  switch (params.type) {
    case "directory":
      results.push(...(await client.directory.findMany({ where })));
      break;

    case "shared directory":
      results.push(
        ...(await client.directory.findMany({
          where: {
            ...where,
            AND: [
              { shareUntil: { not: null } },
              { shareUntil: { gte: new Date() } },
            ],
          },
        }))
      );
      break;

    case "any":
      results.push(
        ...(await client.directory.findMany({ where })),
        ...(await client.file.findMany({ where, include: { directory: true } }))
      );
      break;

    default:
      results.push(
        ...(await client.file.findMany({
          where: {
            ...where,
            type: params.type,
          },
          include: { directory: true },
        }))
      );
  }
  return results;
}
