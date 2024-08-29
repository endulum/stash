import 'dotenv/config';
import './config/passport';
import path from 'path';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { PrismaClient } from '@prisma/client';

import logSession from './src/middleware/logSession';
import errorHandler from './src/middleware/errorHandler';
import sampleRouter from './src/routes/sampleRouter';

const secret: string | undefined = process.env.SECRET
if (secret === undefined) throw new Error('Secret is not defined.')

const app = express()

app.set('views', path.join(__dirname, 'src/views'))
app.set('view engine', 'ejs')
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

app.use(sampleRouter)
app.use(errorHandler)

app.listen(3000)