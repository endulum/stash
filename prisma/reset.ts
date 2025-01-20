import dotenv from "dotenv";
dotenv.config({ path: ".env" + process.env.NODE_ENV });

import { client } from "./client";
import * as devQueries from "./queries/dev";

async function reset() {
  await devQueries.truncateTable("User");
  await devQueries.truncateTable("Session");
  await devQueries.createAdmin();
  await devQueries.seedStash({
    authorId: 1,
    directories: 10,
    files: { min: 10, max: 20 },
  });
}

reset()
  .catch((e) => {
    console.error(e.message);
  })
  .finally(async () => {
    await client.$disconnect();
  });
