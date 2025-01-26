import express, { type Response, type Request } from "express";
import crypto from "crypto";
import path from "path";
import session from "express-session";
import passport from "passport";
import compression from "compression";
import flash from "connect-flash";
import helmet from "helmet";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import "./config/passport";

import { initUser } from "../src/middleware/initUser";
import { initLocals } from "../src/middleware/initLocals";
import { router as shareRouter } from "../src/routes/share";

dotenv.config({ path: ".env." + process.env.NODE_ENV });

const app = express();

// need a nonce for inline scripts that cannot be extracted,
// such as the input checklist scripts
app.use((_req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});

app.set("views", path.join(__dirname, "../src/views"));
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
    contentSecurityPolicy: {
      directives: {
        ...(process.env.SUPABASE_URL && {
          "img-src": ["'self'", process.env.SUPABASE_URL],
        }),
        "script-src": [
          "'self'",
          ((_req: Request, res: Response) => {
            return `'nonce-${res.locals.nonce}'`;
          }) as unknown as string,
        ],
      },
    },
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

app.use(initLocals);

app.use("/shared", shareRouter);

app.use(initUser);

export default app;
