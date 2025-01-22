import { type UserSettings } from "@prisma/client";
import { client } from "../client";

export async function find(authorId: number, id: string) {
  return await client.file.findFirst({
    where: { id, authorId },
    include: {
      directory: true,
    },
  });
}

export async function findChildrenFiles(
  authorId: number,
  directoryId: string | null,
  settings: UserSettings
) {
  return await client.file.findMany({
    where: { authorId, directoryId },
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
