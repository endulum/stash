import request from "supertest";
import * as cheerio from "cheerio";

import app from "../app";
import { wipe, seedStash } from "../../prisma/queries/dev";

const agent = request.agent(app);

const directories: Array<{ id: string; name: string }> = [];
const files: Array<{ id: string; name: string }> = [];

beforeAll(async () => {
  await wipe();
  await agent.post("/login").send({ username: "admin", password: "password" });
});

describe("/root, /dir/:dir", () => {
  beforeAll(async () => {
    const { directoryItems, fileItems } = await seedStash({
      authorId: 1,
      directories: 10,
      files: { min: 0, max: 10 },
    });
    directories.push(...directoryItems);
    files.push(...fileItems);
  });

  test("GET /root - OK", async () => {
    const { text } = await agent.get("/root").expect(200);
    const $ = cheerio.load(text);
    // there should not be a parent link
    expect($("a.entry-link:contains('..')").length).toBe(0);
  });

  test("GET /dir/:dir - OK", async () => {
    const { text } = await agent.get(`/dir/${directories[0].id}`).expect(200);
    const $ = cheerio.load(text);
    // there should be a parent link
    expect($("a.entry-link:contains('..')").length).toBe(1);
  });

  test("GET - can navigate and find all dirs and files", async () => {
    function getLinks(text: string) {
      const $ = cheerio.load(text);
      const links = $("a.entry-link:has(svg)")
        .map((_i, el) => $(el).attr("href"))
        .get();
      return links;
    }

    // make a request to /root, gather links, enqueue links and visit each link
    // to gather and enqueue more links. use the links to count up dirs and files.

    const { text } = await agent.get("/root").expect(200);
    const links = getLinks(text);

    const queue: string[] = links.filter((l) => l.startsWith("/dir"));
    let dirCount = links.reduce((acc, curr) => {
      if (curr.startsWith("/dir")) return acc + 1;
      return acc;
    }, 0);
    let fileCount = links.reduce((acc, curr) => {
      if (curr.startsWith("/file")) return acc + 1;
      return acc;
    }, 0);

    while (queue.length > 0) {
      const currentLink = queue.pop() as string;
      const { text: t } = await agent.get(currentLink).expect(200);
      const currentLinks = getLinks(t);
      if (currentLinks.length > 0) {
        dirCount += currentLinks.reduce((acc, curr) => {
          if (curr.startsWith("/dir")) return acc + 1;
          return acc;
        }, 0);
        fileCount += currentLinks.reduce((acc, curr) => {
          if (curr.startsWith("/file")) return acc + 1;
          return acc;
        }, 0);
        queue.push(...currentLinks.filter((l) => l.startsWith("/dir")));
      }
    }

    expect(dirCount).toEqual(directories.length);
    expect(fileCount).toEqual(files.length);
  });
});
