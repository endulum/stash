import fs from "fs/promises";
import path from "path";
import mime from "mime-types";
import { decode } from "base64-arraybuffer";

import { client } from "../prisma/client";
import { supabase, bucketName } from "./supabase";

async function recursiveRead(dirpath: string, parentId: null | string = null) {
  const entries = await fs.readdir(dirpath, { withFileTypes: true });

  const directory = await client.directory.create({
    data: {
      authorId: 1,
      name: path.basename(dirpath),
      parentId,
    },
  });

  for (const entry of entries) {
    const fullPath = path.join(dirpath, entry.name);

    if (entry.isDirectory()) {
      await recursiveRead(fullPath, directory.id);
    } else {
      const { id } = await client.file.create({
        data: {
          authorId: 1,
          name: path.parse(fullPath).name,
          type: mime.lookup(fullPath) || "binary",
          ext: path.parse(fullPath).ext.slice(1),
          size: (await fs.stat(fullPath)).size,
          directoryId: directory.id,
        },
      });
      const supaFilePath = `user_1/${id}`;

      const buffer = await fs.readFile(fullPath);
      const fileBase64 = decode(buffer.toString("base64"));
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(supaFilePath, fileBase64, {
          contentType: mime.lookup(fullPath) || "binary",
        });
      if (error) {
        // if something goes wrong, delete the entry
        await client.file.delete({ where: { id } });
        throw error;
      }
    }
  }
}

export async function readSamples() {
  const samplesPath = path.join(__dirname, "sample_files");
  await recursiveRead(samplesPath);
}
