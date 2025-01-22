import request from "supertest";

import app from "../app";
import { wipe, seedStash } from "../../prisma/queries/dev";

const agent = request.agent(app);

const files: Array<{ id: string; name: string }> = [];

beforeAll(async () => {
  await wipe();
  await agent.post("/login").send({ username: "admin", password: "password" });
});

describe("/file/:file", () => {
  beforeAll(async () => {
    const { fileItems } = await seedStash({
      authorId: 1,
      directories: 0,
      files: { min: 1, max: 1 },
    });
    files.push(...fileItems);
  });

  test("GET - ok", async () => {
    await agent.get(`/file/${files[0].id}`).expect(200);
  });
});
