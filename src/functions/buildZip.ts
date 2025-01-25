import { type Directory } from "@prisma/client";
import Zip from "adm-zip";

import { findDescendants } from "../../prisma/queries/directory";
import { findChildrenFiles } from "../../prisma/queries/file";
import { getBuffer } from "../../supabase/supabase";

export async function buildZip(directory: Directory | null) {
  const zip = new Zip();

  const descendants = await findDescendants(directory ?? { id: null });
  if (directory)
    descendants.unshift({ id: directory.id, name: directory.name });

  for (const descendant of descendants) {
    const files = await findChildrenFiles(descendant.id);

    if (
      // quicker way to check dir child count without having to query:
      // are there other descendants sharing this descendant path?
      descendants.filter((d) => d.name.startsWith(descendant.name)).length ===
        1 &&
      files.length === 0
    ) {
      // keep empty directories by adding a hidden '.keep' to them
      zip.addFile(descendant.name + "/.keep", Buffer.from(""));
    }

    await Promise.all(
      files.map(async (file) => {
        const { buffer } = await getBuffer(file.id, file.authorId);
        zip.addFile(descendant.name + "/" + file.name + "." + file.ext, buffer);
      })
    );
  }

  const buffer = zip.toBuffer();
  return buffer;
}
