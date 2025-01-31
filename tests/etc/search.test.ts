import request from "supertest";
import * as cheerio from "cheerio";

import app from "../app";
import { wipe, seedStash } from "../../prisma/queries/dev";
import { File, Directory } from "@prisma/client";

const agent = request.agent(app);

const files: File[] = [];
const directories: Directory[] = [];

beforeAll(async () => {
  await wipe();
  await agent.post("/login").send({ username: "admin", password: "password" });
  const { directoryItems, fileItems } = await seedStash({
    authorId: 1,
    directories: 10,
    files: { min: 10, max: 10 },
  });
  files.push(...fileItems);
  directories.push(...directoryItems);
});

describe("GET /search", async () => {
  test("OK", async () => {
    await agent.get("/search").expect(200);
  });

  test("get all items", async () => {
    const { text } = await agent.get("/search?type=any").expect(200);
    const $ = cheerio.load(text);
    expect($("li.search-result").length).toBe(
      directories.length + files.length
    );
  });

  test("get dirs only", async () => {
    const { text } = await agent.get("/search?type=directory").expect(200);
    const $ = cheerio.load(text);
    expect($("li.search-result").length).toBe(directories.length);
  });
});
