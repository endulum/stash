import { client } from "../client";

export async function findChildrenFiles(
  authorId: number,
  directoryId: string | null
) {
  const order = await client.userSettings.findFirst({
    where: { userId: authorId },
  });
  return await client.file.findMany({
    where: { authorId, directoryId },
    orderBy: {
      [order ? order.sortFiles : "name"]: order
        ? order.sortFilesDirection
        : "asc",
    },
  });
}
