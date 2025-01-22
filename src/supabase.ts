import { createClient } from "@supabase/supabase-js";
import { client } from "../prisma/client";
import { decode } from "base64-arraybuffer";

import dotenv from "dotenv";
import { ofetch } from "ofetch";
import { Readable } from "stream";
dotenv.config({ path: ".env." + process.env.NODE_ENV });

const supabase = createClient(
  process.env.SUPABASE_URL ||
    (function () {
      throw new Error("Supabase URL was not provided.");
    })(),
  process.env.SUPABASE_SERVICE_KEY ||
    (function () {
      throw new Error("Supabase service key was not provided.");
    })()
);

const bucketName = `stash_${process.env.NODE_ENV}`;

export async function upload(
  file: Express.Multer.File,
  authorId: number,
  directoryId: string | null
): Promise<string | null> {
  // parse out the file extension
  const fileName = file.originalname.split(".")[0];
  const fileExt = file.originalname.split(".")[1];

  // create the database entry so we can get the id
  const newFile = await client.file.create({
    data: {
      name: fileName,
      ext: fileExt,
      type: file.mimetype,
      size: file.size,
      directoryId,
      authorId,
    },
  });
  const supaFilePath = `user_${authorId}/${newFile.id}`;

  // attempt upload
  const fileBase64 = decode(file.buffer.toString("base64"));
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(supaFilePath, fileBase64, {
      contentType: file.mimetype,
    });
  if (error) {
    // if something goes wrong, delete the entry
    await client.file.delete({ where: { id: newFile.id } });
    return null;
  }
  return newFile.id;
}

async function getSignedUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, 30);
  if (error) throw error;
  return data.signedUrl;
}

export async function getReadable(fileName: string, authorId: number) {
  // todo: we need author id since we've divided files into folders
  // based on user id. but what if this is a file from a shared
  // folder, and we don't have req.thisUser?
  // 1. have this function look for the owner of the file
  // 2. add `thisSharedOwner` to req and use that to give the author id
  const signedUrl = await getSignedUrl(`user_${authorId}/${fileName}`);
  const response = await ofetch.raw(signedUrl, {
    responseType: "arrayBuffer",
  });
  const contentType = response.headers.get("content-type");
  const buffer = response._data;
  if (!buffer)
    throw new Error("Error loading file from bucket: Buffer is empty.");
  const readable = Readable.from(Buffer.from(buffer));
  return { readable, contentType };
}

// perform a check on server run so we can throw an error right away
// if the buckets we're expecting don't exist
async function checkBucket() {
  const { error } = await supabase.storage.getBucket(bucketName);
  if (error) throw error;
}

checkBucket();

/* 



export async function empty() {
  const { data: filesData, error: listError } = await supabaseService.storage
    .from(bucketName)
    .list(process.env.NODE_ENV);
  if (listError) throw listError;
  const files = filesData.map((f) => `${process.env.NODE_ENV}/${f.name}`);
  const { error: deleteError } = await supabaseService.storage
    .from(bucketName)
    .remove(files);
  if (deleteError) throw deleteError;
}
 */
