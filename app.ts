import 'dotenv/config';
import './config/passport';
import path from 'path';
import express from 'express';
import asyncHandler from 'express-async-handler';
import session from 'express-session';
import passport from 'passport';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { PrismaClient } from '@prisma/client';

import logSession from './src/middleware/logSession';
import errorHandler from './src/middleware/errorHandler';

import outsideRouter from './src/routes/outsideRouter';
import insideRouter from './src/routes/insideRouter';

const secret: string | undefined = process.env.SECRET
if (secret === undefined) throw new Error('Secret is not defined.')

const app = express()

app.set('views', path.join(__dirname, 'src/views'))
app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'src/public')))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
  secret,
  resave: false,
  saveUninitialized: true,
  store: new PrismaSessionStore(
    new PrismaClient(),
    {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined
    }
  ),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24
  }
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(logSession)

app.use(asyncHandler(async (req, res, next) => {
  res.locals.user = req.user
  return req.user ? insideRouter(req, res, next) : outsideRouter(req, res, next)
}))

// app.use(errorHandler)

app.listen(3000)