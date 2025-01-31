import request from "supertest";

import app from "../app";
import { wipe, seedStash, createBulkFiles } from "../../prisma/queries/dev";
import { create } from "../../prisma/queries/directory";

let directory: { id?: string; name?: string } = {};
let privateSubdirId: string = "";
let sharedSubdirId: string = "";
const agent = request.agent(app);

beforeAll(async () => {
  await wipe();
  await agent.post("/login").send({ username: "admin", password: "password" });
  const { directoryItems } = await seedStash({
    authorId: 1,
    directories: 1,
    files: { min: 0, max: 0 },
  });
  directory = directoryItems[0];
});

describe("GET /shared/:sharedDir", () => {
  test("POST /dir/:dir/edit - past date will not let it be shared", async () => {
    await agent
      .post(`/dir/${directory.id}/edit`)
      .send({
        name: "shared_dir",
        location: "home",
        shareUntil: "2024-12-31",
      })
      .expect(302);
    await agent.get(`/shared/${directory.id}`).expect(404);
  });

  test("POST /dir/:dir/edit - future date will let it be shared", async () => {
    await agent
      .post(`/dir/${directory.id}/edit`)
      .send({
        name: "shared_dir",
        location: "home",
        shareUntil: "2025-12-31",
      })
      .expect(302);
    await agent.get(`/shared/${directory.id}`).expect(200);
  });
});

describe("GET /shared/:sharedDir/dir/:dir", () => {
  beforeAll(async () => {
    privateSubdirId = await create({
      authorId: 1,
      name: "private",
    });
    sharedSubdirId = await create({
      authorId: 1,
      name: "public",
      parentId: directory.id,
    });
  });

  test("GET - 404 if dir is not descendant of shared", async () => {
    await agent
      .get(`/shared/${directory.id}/dir/${privateSubdirId}`)
      .expect(404);
  });

  test("GET - 200 if dir is descendant of shared", async () => {
    await agent
      .get(`/shared/${directory.id}/dir/${sharedSubdirId}`)
      .expect(200);
  });
});

describe("GET /shared/:sharedDir/file/:file", () => {
  let privateFileId: string = "";
  let sharedFileId: string = "";
  beforeAll(async () => {
    const [privateFile] = await createBulkFiles(1, 1, privateSubdirId);
    privateFileId = privateFile.id;
    const [sharedFile] = await createBulkFiles(1, 1, sharedSubdirId);
    sharedFileId = sharedFile.id;
  });

  test("GET - 404 if file is not descendant of shared", async () => {
    await agent.get(`/shared/${directory.id}/dir/${privateFileId}`).expect(404);
  });

  test("GET - 200 if file is descendant of shared", async () => {
    await agent.get(`/shared/${directory.id}/file/${sharedFileId}`).expect(200);
  });
});

// manually test:
// /shared/:sharedDir/download
// /shared/:sharedDir/dir/:dir/download
// /shared/:sharedDir/serve/:file
// /shared/:sharedDir/file/:file/download
