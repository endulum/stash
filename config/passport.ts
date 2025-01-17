import passport, { type DoneCallback } from "passport";
import passportLocal, { type VerifyFunction } from "passport-local";
import passportGithub from "passport-github2";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

import * as userQueries from "../prisma/queries/user";

const prisma = new PrismaClient();
const LocalStrategy = passportLocal.Strategy;
const GitHubStrategy = passportGithub.Strategy;

passport.use(
  new LocalStrategy((async (
    username: string,
    password: string,
    done: DoneCallback
  ) => {
    try {
      const user = await prisma.user.findUnique({
        where: { username },
      });
      if (!user || !user.password) return done(null, false);
      const match = await bcrypt.compare(password, user.password);
      if (!match) return done(null, false);
      return done(null, user as Express.User);
    } catch (e) {
      return done(e);
    }
  }) as VerifyFunction)
);

passport.use(
  new GitHubStrategy(
    {
      clientID:
        process.env.GITHUB_CLIENT_ID ||
        (function () {
          throw new Error("Github client id is not defined.");
        })(),
      clientSecret:
        process.env.GITHUB_CLIENT_SECRET ||
        (function () {
          throw new Error("Github client secret is not defined.");
        })(),
      callbackURL: process.env.DEPLOYMENT_URL
        ? `${process.env.DEPLOYMENT_URL}/github`
        : (function () {
            throw new Error("Project deployment URL is not specified.");
          })(),
    },
    async function (
      _accessToken: string,
      _refreshToken: string,
      profile: {
        _json: {
          login: string;
          id: number;
        };
      },
      done: (error: unknown, user?: Express.User) => void
    ) {
      try {
        let username = "";
        let id = 0;
        const existingUser = await userQueries.find({
          githubId: profile._json.id,
        });
        if (existingUser) {
          // if a user exists, great!
          // keep the user's gh login up to date
          username = existingUser.username;
          id = existingUser.id;
          await userQueries.updateGithubUser(id, profile._json.login);
        } else {
          // if a user doesn't exist, make one
          const newUserId = await userQueries.create({
            username: profile._json.login,
            githubId: profile._json.id,
            githubUser: profile._json.login,
          });
          username = profile._json.login;
          id = newUserId as number;
        }
        return done(null, { username, id } as Express.User);
      } catch (e) {
        return done(e);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, "id" in user && user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    done(null, user as Express.User);
  } catch (err) {
    done(err);
  }
});
