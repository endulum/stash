import { createClient } from "@supabase/supabase-js";
import { ofetch } from "ofetch";
import { Readable } from "stream";
import { decode } from "base64-arraybuffer";
import { type Directory } from "@prisma/client";

import { client } from "../prisma/client";
import { findDescendantFiles } from "../prisma/queries/file";

import dotenv from "dotenv";
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

  await client.user.update({
    where: { id: authorId },
    data: { storage: { increment: file.size } },
  });
  return newFile.id;
}

export async function del(fileId: string, fileAuthorId: number) {
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([`user_${fileAuthorId}/${fileId}`]);
  if (error) throw error;
}

export async function delDir(directory: Directory) {
  const files = (await findDescendantFiles(directory, directory.authorId)).map(
    (f) => `user_${f.authorId}/${f.id}`
  );
  if (files.length === 0) return;
  const { error } = await supabase.storage.from(bucketName).remove(files);
  if (error) throw error;
}

export async function delAllUserFiles(authorId: number) {
  const files = (
    await client.file.findMany({
      where: { authorId },
    })
  ).map((f) => `user_${f.authorId}/${f.id}`);
  if (files.length === 0) return;
  const { error } = await supabase.storage.from(bucketName).remove(files);
  if (error) throw error;
}

async function getSignedUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, 30);
  if (error) throw error;
  return data.signedUrl;
}

export async function getBuffer(fileId: string, fileAuthorId: number) {
  const signedUrl = await getSignedUrl(`user_${fileAuthorId}/${fileId}`);
  const response = await ofetch.raw(signedUrl, {
    responseType: "arrayBuffer",
  });
  const contentType = response.headers.get("content-type");
  const buffer = response._data;
  if (!buffer)
    throw new Error("Error loading file from bucket: Buffer is empty.");
  return { buffer: Buffer.from(buffer), contentType };
}

export async function getReadable(fileId: string, fileAuthorId: number) {
  const { buffer, contentType } = await getBuffer(fileId, fileAuthorId);
  const readable = Readable.from(buffer);
  return { readable, contentType };
}

export async function empty() {
  const { error: deleteError } = await supabase.storage.emptyBucket(bucketName);
  if (deleteError) throw deleteError;
}

// perform a check on server run so we can throw an error right away
// if the buckets we're expecting don't exist
async function checkBucket() {
  const { error } = await supabase.storage.getBucket(bucketName);
  if (error) throw error;
}

checkBucket();
