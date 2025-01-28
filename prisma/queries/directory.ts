import { type Directory, type UserSettings } from "@prisma/client";

import { client } from "../client";
import { findDescendantFiles } from "./file";

const include = (settings?: UserSettings | null) => ({
  directories: settings
    ? {
        orderBy: [
          { [settings.sortDirs]: settings.sortDirsDirection },
          ...(settings.sortDirs === "updated"
            ? [{ created: settings.sortDirsDirection }]
            : []),
        ],
      }
    : true,
  files: settings
    ? {
        orderBy: [
          { [settings.sortFiles]: settings.sortFilesDirection },
          ...(settings.sortFiles === "updated"
            ? [{ created: settings.sortFilesDirection }]
            : []),
        ],
      }
    : true,
});

export async function create({
  authorId,
  name,
  parentId,
}: {
  authorId: number;
  name: string;
  parentId?: string;
}) {
  const { id } = await client.directory.create({
    data: {
      name,
      parentId,
      authorId,
    },
  });
  return id;
}

export async function find(
  id: string,
  authorId?: number,
  settings?: UserSettings | null
) {
  return await client.directory.findFirst({
    where: {
      id,
      ...(authorId && { authorId }),
    },
    include: include(settings),
  });
}

// for GET /dir/root
export async function findDirsAtRoot(
  authorId: number,
  settings?: UserSettings | null
) {
  return await client.directory.findMany({
    where: {
      parentId: null,
      ...(authorId && { authorId }),
    },
    ...(settings && {
      orderBy: { [settings.sortDirs]: settings.sortDirsDirection },
    }),
  });
}

// for GET /shared/:sharedDir
export async function findShared(id: string, settings?: UserSettings | null) {
  return await client.directory.findFirst({
    where: {
      id,
      AND: [{ shareUntil: { not: null } }, { shareUntil: { gte: new Date() } }],
    },
    include: {
      ...include(settings),
      author: { select: { id: true, username: true } },
    },
  });
}

// assists in directory path component
export async function findPath(
  dir: Directory | null,
  path: Array<{ name: string; id: string }> = []
) {
  if (!dir) return path;
  path.unshift({ name: dir.name, id: dir.id });
  if (!dir.parentId) return path;
  const parent = await client.directory.findFirst({
    where: { id: dir.parentId },
  });
  if (!parent) return path;
  return findPath(parent, path);
}

// assists in determining if a directory is a descendant of a shared directory
export async function trimPath(
  startingDir: Directory,
  endingDirId: string | null
) {
  const path = await findPath(startingDir);
  while (path.length > 0) {
    const p = path.shift();
    if (!p || p.id === endingDirId) break;
  }
  return path;
}

// assists in preventing similarly-named items at same location
export async function findNamedDuplicate(
  name: string,
  parentId: string | null
) {
  return await client.directory.findFirst({
    where: { name, parentId },
  });
}

// convenience for making path strings
export async function getPathString(dir: Directory) {
  const path = (await findPath(dir)).map((loc) => loc.name).join("/");
  return "/" + (path.length > 0 ? path + "/" : "");
}

// assists in zip building and location dropdowns
export async function findDescendants(
  authorId: number,
  parent: { name: string; id: string } | { id: null },
  children: Array<{ id: string; name: string }> = []
): Promise<Array<{ id: string; name: string }>> {
  const directories = await client.directory.findMany({
    where: { authorId, parentId: parent.id },
    select: {
      id: true,
      name: true,
    },
  });
  if (directories.length === 0) return children;

  // renaming, so that the "name" contains the full path
  // useful for directory select dropdown, and creating the .zip
  const renamedDirectories = directories.map((dir) => ({
    ...dir,
    name: parent.id ? parent.name + "/" + dir.name : "/" + dir.name,
  }));

  children.push(...renamedDirectories);
  return [
    ...children,
    ...(
      await Promise.all(
        renamedDirectories.map(async (dir) => findDescendants(authorId, dir))
      )
    ).flat(),
  ];
}

export async function edit(
  id: string,
  body: {
    name?: string;
    location?: string;
    shareUntil?: string;
  }
) {
  await client.directory.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.location && {
        parentId: body.location === "home" ? null : body.location,
      }),
      ...(body.shareUntil && {
        shareUntil: body.shareUntil === "" ? null : new Date(body.shareUntil),
      }),
      updated: new Date(),
    },
  });
}

export async function del(directory: Directory) {
  const totalFileSize = (
    await findDescendantFiles(directory, directory.authorId)
  ).reduce((acc, curr) => acc + curr.size, 0);
  await client.directory.delete({ where: { id: directory.id } });
  await client.user.update({
    where: { id: directory.authorId },
    data: { storage: { decrement: totalFileSize } },
  });
}
