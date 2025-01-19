import { client } from "../client";

export async function findAtDir(authorId: number, directoryId: string) {
  return await client.file.findMany({
    where: { authorId, directoryId },
  });
}

export async function findAtRoot(authorId: number) {
  return await client.file.findMany({
    where: { authorId, directoryId: null },
  });
}
