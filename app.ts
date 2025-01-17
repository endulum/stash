import express from "express";
import path from "path";
import session from "express-session";
import passport from "passport";
import compression from "compression";
import flash from "connect-flash";
import helmet from "helmet";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { PrismaClient } from "@prisma/client";
import logger from "morgan";
import dotenv from "dotenv";
import "./config/passport";

dotenv.config({ path: ".env." + process.env.NODE_ENV });

const app = express();

app.set("views", path.join(__dirname, "src/views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "src/public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(compression());
app.use(flash());

app.use(
  helmet({
    ...(process.env.SUPABASE_URL && {
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", process.env.SUPABASE_URL],
        },
      },
    }),
  })
);

app.use(
  session({
    name: "sessionId",
    secret:
      process.env.SESSION_SECRET ||
      (() => {
        throw new Error("Session secret is not defined.");
      })(),
    resave: false,
    saveUninitialized: true,
    store: new PrismaSessionStore(new PrismaClient(), {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
    cookie: {
      ...(process.env.NODE_ENV === "production" && {
        secure: true,
        httpOnly: true,
      }),
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

if (process.env.NODE_ENV === "development") {
  app.use(logger("dev"));
}

app.get("/", async (req, res) => {
  res.sendStatus(200);
});

app.get("*", async (req, res) => {
  res.sendStatus(404);
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  process.stdout.write(
    `⚡️ server starting at http://localhost:${port} in ${process.env.NODE_ENV} mode\n`
  );
});
