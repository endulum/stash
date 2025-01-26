import request from "supertest";

import app from "../app";
import { wipe, seedStash } from "../../prisma/queries/dev";
import { checkFormOk } from "../helpers";
import { File } from "@prisma/client";

const agent = request.agent(app);

const files: File[] = [];

beforeAll(async () => {
  await wipe();
  await agent.post("/login").send({ username: "admin", password: "password" });
  const { fileItems } = await seedStash({
    authorId: 1,
    directories: 0,
    files: { min: 1, max: 1 },
  });
  files.push(...fileItems);
});

describe("/file/new", () => {
  test("GET - ok", async () => {
    await agent.get("/file/new").expect(200);
  });

  // manually test upload
});

describe("/file/:file", () => {
  test("GET - ok", async () => {
    await agent.get(`/file/${files[0].id}`).expect(200);
  });
});

describe("/file/:file/edit", () => {
  const correctInputs = { name: "file", location: "home" };

  test("GET - ok", async () => {
    await agent.get(`/file/${files[0].id}/edit`).expect(200);
  });

  test("POST - 400 and errors", async () => {
    await Promise.all(
      [{ name: "" }, { name: "/" }, { location: "" }, { location: "owo" }].map(
        async (wrongInputs) => {
          await agent
            .post(`/file/${files[0].id}/edit`)
            .send({ ...correctInputs, ...wrongInputs })
            .expect(400);
        }
      )
    );
  });

  test("POST - 302 with correct inputs", async () => {
    await agent
      .post(`/file/${files[0].id}/edit`)
      .send(correctInputs)
      .expect(checkFormOk)
      .expect("Location", `/file/${files[0].id}`);
  });

  test("GET /file/:file - ok", async () => {
    await agent.get(`/file/${files[0].id}`).expect(200);
  });
});

describe("/file/:file/delete", () => {
  test("GET - ok", async () => {
    await agent.get(`/file/${files[0].id}/delete`).expect(200);
  });

  test("POST - 400 and errors", async () => {
    await Promise.all(
      [{ path: "" }, { path: "owo" }].map(async (wrongInputs) => {
        await agent
          .post(`/file/${files[0].id}/delete`)
          .send(wrongInputs)
          .expect(400);
      })
    );
  });

  test("POST - 304 with correct inputs", async () => {
    await agent
      .post(`/file/${files[0].id}/delete`)
      .send({ path: "/file." + files[0].ext })
      .expect(checkFormOk);
  });

  test("GET /file/:file - 404, it should no longer exist", async () => {
    await agent.get(`/file/${files[0].id}`).expect(404);
  });
});

// manually test file serving and download
