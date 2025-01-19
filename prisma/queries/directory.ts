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
  await client.directory.create({
    data: {
      name,
      parentId,
      authorId,
    },
  });
}

export async function findOne(id: string) {
  return await client.directory.findFirst({
    where: { id },
    include: {
      directories: {
        select: {
          id: true,
          name: true,
        },
      },
      files: true,
    },
  });
}

export async function findAtRoot(authorId: number) {
  return await client.directory.findMany({
    where: { authorId, parentId: null },
    include: {
      directories: {
        select: {
          id: true,
          name: true,
        },
      },
      files: true,
    },
  });
}

export async function findPath(
  id: string,
  path: Array<{ id: string; name: string; parentId: string | null }> = []
) {
  const parent = await client.directory.findFirst({
    where: { directories: { some: { id } } },
    select: { id: true, parentId: true, name: true },
  });
  if (!parent) return path;
  path.unshift(parent);
  return findPath(parent.id, path);
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
    name: parent.id ? parent.name + "/" + dir.name : dir.name,
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
