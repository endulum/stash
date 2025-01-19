import request from "supertest";
import app from "../app";
import { wipe } from "../../prisma/queries/dev";

afterAll(async () => {
  await wipe();
});

describe("/login", () => {
  const agent = request.agent(app);
  const correctInputs = {
    username: "admin",
    password: "password",
  };

  test("GET / - 302 and redirects to /login when not logged in", async () => {
    await agent.get("/").expect(302).expect("Location", "/login");
  });

  test("GET - 200 and load login page when not logged in", async () => {
    await agent.get("/login").expect(200);
  });

  test("POST - 400 and errors", async () => {
    await Promise.all(
      [
        { username: "" },
        { password: "" },
        { password: "some wrong password" },
      ].map(async (wrongInputs) => {
        await agent
          .post("/login")
          .send({ ...correctInputs, ...wrongInputs })
          .expect(400);
      })
    );
  });

  test("POST - 302 and redirects to / if inputs are correct", async () => {
    await agent
      .post("/login")
      .send(correctInputs)
      .expect(302)
      .expect("Location", "/");
  });

  test("GET - 302 and redirects to / if logged in", async () => {
    await agent.get("/login").expect(302).expect("Location", "/");
  });

  test("GET / - 200 and no redirect", async () => {
    await agent.get("/").expect(200);
  });
});

describe("/signup", () => {
  const agent = request.agent(app);
  const correctInputs = {
    username: "demo-user",
    password: "password",
    confirmPassword: "password",
  };

  test("GET - 200 and load signup page when not logged in", async () => {
    await agent.get("/signup").expect(200);
  });

  test("POST - 400 and errors", async () => {
    await Promise.all(
      [
        { username: "" },
        { password: "" },
        { confirmPassword: "" },
        { username: "admin" },
        { password: "some mismatched password" },
        { confirmPassword: "some mismatched password" },
      ].map(async (wrongInputs) => {
        await agent
          .post("/signup")
          .send({ ...correctInputs, ...wrongInputs })
          .expect(400);
      })
    );
  });

  test("POST - 302 and redirects to /login if inputs are correct", async () => {
    await agent
      .post("/signup")
      .send(correctInputs)
      .expect(302)
      .expect("Location", "/login");
  });

  test("POST /login - can log into new user", async () => {
    await agent
      .post("/login")
      .send({
        username: correctInputs.username,
        password: correctInputs.password,
      })
      .expect(302)
      .expect("Location", "/");
  });
});
