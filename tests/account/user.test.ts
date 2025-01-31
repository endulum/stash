import request from "supertest";
import app from "../app";
import { wipe } from "../../prisma/queries/dev";
import { create } from "../../prisma/queries/user";
import { checkFormOk } from "../helpers";

const agent = request.agent(app);

beforeAll(async () => {
  await wipe();
  await agent.post("/login").send({ username: "admin", password: "password" });
  await create({ username: "basic" });
});

describe("/account", () => {
  const correctInputs = {
    username: "admin",
    password: "new-password",
    confirmPassword: "new-password",
    currentPassword: "password",
  };

  test("GET - 200", async () => {
    await agent.get("/account").expect(200);
  });

  test("POST - 400 and errors", async () => {
    await Promise.all(
      [
        { username: "" },
        { confirmPassword: "" },
        { currentPassword: "" },
        { username: "basic" },
        { username: "a" },
        { username: "&&&&" },
        { password: "." },
        { password: "some mismatched password" },
        { confirmPassword: "some mismatched password" },
        { currentPassword: "some mismatched password" },
      ].map(async (wrongInputs) => {
        await agent
          .post("/account")
          .send({ ...correctInputs, ...wrongInputs })
          .expect(400);
      })
    );
  });

  test("POST - 400 if any invalid sort", async () => {
    await Promise.all(
      ["sortFiles", "sortFilesDirection", "sortDirs", "sortDirsDirection"].map(
        async (sortName) => {
          await agent
            .post("/account")
            .send({ [sortName]: "owo" })
            .expect(400);
        }
      )
    );
  });

  test("POST - 200 without password", async () => {
    await agent
      .post("/account")
      .send({ username: "demo-user" })
      .expect(checkFormOk)
      .expect("Location", "/account");
    // change it back
    await agent
      .post("/account")
      .send({ username: "admin" })
      .expect(checkFormOk)
      .expect("Location", "/account");
  });

  test("POST - 200 with password", async () => {
    await agent
      .post("/account")
      .send(correctInputs)
      .expect(checkFormOk)
      .expect("Location", "/account");
  });

  test("can log out and in with new details", async () => {
    await agent.get("/logout");
    await agent
      .post("/login")
      .send({
        username: correctInputs.username,
        password: correctInputs.password,
      })
      .expect(checkFormOk)
      .expect("Location", "/");

    // change it all back
    await agent
      .post("/account")
      .send({
        username: "admin",
        password: "password",
        confirmPassword: "password",
        currentPassword: "new-password",
      })
      .expect(checkFormOk)
      .expect("Location", "/account");
  });
});

describe("/delete", () => {
  test("GET - 200 and load account deletion page", async () => {
    await agent.get("/delete").expect(200);
  });

  test("POST - 400 and errors", async () => {
    await Promise.all(
      [{ password: "" }, { password: "some wrong password" }].map(
        async (wrongInput) => {
          await agent.post("/account").send({ wrongInput }).expect(400);
        }
      )
    );
  });

  test("POST - 200 and deletes", async () => {
    await agent
      .post("/delete")
      .send({ password: "password" })
      .expect(checkFormOk)
      .expect("location", "/signup");
  });
});
