import { Directory, type UserSettings } from "@prisma/client";
import { client } from "../client";

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
    },
  });
}

export async function find(id: string) {
  return await client.directory.findFirst({
    where: { id },
  });
}

export async function findShared(id: string) {
  return await client.directory.findFirst({
    where: {
      id,
      AND: [{ shareUntil: { not: null } }, { shareUntil: { gte: new Date() } }],
    },
    include: {
      author: {
        include: {
          settings: true,
        },
      },
    },
  });
}

export async function findWithAuthor(authorId: number, id: string) {
  return await client.directory.findFirst({
    where: { id, authorId },
  });
}

export async function findChildrenDirs(
  parentId: string | null,
  settings: UserSettings
) {
  return await client.directory.findMany({
    where: { parentId },
    include: {
      directories: true,
    },
    orderBy: [
      { [settings.sortDirs]: settings.sortDirsDirection },
      // secondarily sort by created if updated is primary sort
      ...(settings.sortDirs === "updated"
        ? [
            {
              created: settings.sortDirsDirection,
            },
          ]
        : []),
    ],
  });
}

export async function findExistingWithName(
  authorId: number,
  parentId: string,
  name: string
) {
  return await client.directory.findFirst({
    where: { name, parentId, authorId },
  });
}

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

export async function getPathString(dir: Directory) {
  return "/" + (await findPath(dir)).map((loc) => loc.name).join("/") + "/";
}

export async function findChildren(
  parent: { name: string; id: string } | { id: null },
  children: Array<{ id: string; name: string }> = []
): Promise<Array<{ id: string; name: string }>> {
  const directories = await client.directory.findMany({
    where: { parentId: parent.id },
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
        renamedDirectories.map(async (dir) => findChildren(dir))
      )
    ).flat(),
  ];
}

export async function del(id: string) {
  await client.directory.delete({ where: { id } });
}
