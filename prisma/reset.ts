import dotenv from "dotenv";
dotenv.config({ path: ".env" + process.env.NODE_ENV });

import { client } from "./client";
import * as devQueries from "./queries/dev";
import { empty } from "../supabase/client";
import { readSamples } from "../supabase/readSamples";

async function reset() {
  await empty();
  await devQueries.truncateTable("User");
  await devQueries.truncateTable("Session");
  await devQueries.createAdmin();
  await readSamples();
}

reset()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await client.$disconnect();
  });
