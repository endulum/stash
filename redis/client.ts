import { createClient, commandOptions } from "redis";

const client = createClient({
  url:
    process.env.REDIS_URL ||
    (function () {
      throw new Error("Redis URL is missing.");
    })(),
});

client.on("error", (err) => console.error("Redis Client Error", err));
client.connect();

export async function findCachedFile(fileId: string) {
  const buffer = await client.get(
    commandOptions({ returnBuffers: true }),
    `STASH_${fileId}`
  );
  return buffer ?? null;
}

export async function addCachedFile(fileId: string, buffer: Buffer) {
  await client.setEx(`STASH_${fileId}`, 3600, buffer);
}

export { client };
