import { type UserSettings, type Prisma } from "@prisma/client";
import { client } from "../client";
import { findPath } from "./directory";

export async function find(id: string) {
  return await client.file.findFirst({
    where: { id },
    include: {
      directory: true,
    },
  });
}

export async function findWithAuthor(authorId: number, id: string) {
  return await client.file.findFirst({
    where: { id, authorId },
    include: {
      directory: true,
    },
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

export async function getPathString(
  file: Prisma.FileGetPayload<{ include: { directory: true } }>
) {
  return (
    "/" +
    (await findPath(file.directory)).map((loc) => loc.name).join("/") +
    "/" +
    file.name +
    "." +
    file.ext
  );
}

export async function findExistingWithName(
  authorId: number,
  directoryId: string | null,
  name: string
) {
  return await client.file.findFirst({
    where: { name, directoryId, authorId },
  });
}

export async function findChildrenFiles(
  directoryId: string | null,
  settings: UserSettings
) {
  return await client.file.findMany({
    where: { directoryId },
    orderBy: [
      { [settings.sortFiles]: settings.sortFilesDirection },
      // secondarily sort by created if updated is primary sort
      ...(settings.sortFiles === "updated"
        ? [
            {
              created: settings.sortFilesDirection,
            },
          ]
        : []),
      // secondarily sort by name if type is primary sort
      ...(settings.sortFiles === "type"
        ? [
            {
              name: settings.sortFilesDirection,
            },
          ]
        : []),
    ],
  });
}

export async function del(id: string) {
  await client.file.delete({ where: { id } });
}
