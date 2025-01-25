import { createClient } from "@supabase/supabase-js";
import { client } from "../prisma/client";
import { decode } from "base64-arraybuffer";

import dotenv from "dotenv";
import { ofetch } from "ofetch";
import { Readable } from "stream";
dotenv.config({ path: ".env." + process.env.NODE_ENV });

export const supabase = createClient(
  process.env.SUPABASE_URL ||
    (function () {
      throw new Error("Supabase URL was not provided.");
    })(),
  process.env.SUPABASE_SERVICE_KEY ||
    (function () {
      throw new Error("Supabase service key was not provided.");
    })()
);

export const bucketName = `stash_${process.env.NODE_ENV}`;

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

export async function getBuffer(fileName: string, authorId: number) {
  const signedUrl = await getSignedUrl(`user_${authorId}/${fileName}`);
  const response = await ofetch.raw(signedUrl, {
    responseType: "arrayBuffer",
  });
  const contentType = response.headers.get("content-type");
  const buffer = response._data;
  if (!buffer)
    throw new Error("Error loading file from bucket: Buffer is empty.");
  return { buffer: Buffer.from(buffer), contentType };
}

export async function getReadable(fileName: string, authorId: number) {
  const { buffer, contentType } = await getBuffer(fileName, authorId);
  const readable = Readable.from(buffer);
  return { readable, contentType };
}

export async function empty() {
  const files = await client.file.findMany({
    where: {},
    select: {
      authorId: true,
      id: true,
    },
  });
  if (files.length === 0) return;
  const fileUrls = files.map((f) => `user_${f.authorId}/${f.id}`);
  const { error: deleteError } = await supabase.storage
    .from(bucketName)
    .remove(fileUrls);
  if (deleteError) throw deleteError;
}

// perform a check on server run so we can throw an error right away
// if the buckets we're expecting don't exist
async function checkBucket() {
  const { error } = await supabase.storage.getBucket(bucketName);
  if (error) throw error;
}

checkBucket();
