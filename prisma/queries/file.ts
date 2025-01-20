import { type UserSettings } from "@prisma/client";
import { client } from "../client";

export async function findChildrenFiles(
  authorId: number,
  directoryId: string | null,
  settings: UserSettings
) {
  return await client.file.findMany({
    where: { authorId, directoryId },
    orderBy: {
      [settings.sortFiles]: settings.sortFilesDirection,
    },
  });
}
