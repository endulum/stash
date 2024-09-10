import 'dotenv/config';
import './config/passport';
import path from 'path';
import express from 'express';
import flash from 'connect-flash';
import asyncHandler from 'express-async-handler';
import session from 'express-session';
import passport from 'passport';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { PrismaClient } from '@prisma/client';

// import errorHandler from './src/middleware/errorHandler'

import authRouter from './src/routes/auth';
import mainRouter from './src/routes/main';
import shareRouter from './src/routes/share'

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
app.use(flash())
app.use(passport.initialize())
app.use(passport.session())

app.use(asyncHandler(async (req, res, next) => {
  res.locals.user = req.user
  res.locals.warning = req.flash('warning')
  res.locals.success = req.flash('success')
  return next()
}))

app.use('/share', shareRouter)

app.use(asyncHandler(async (req, res, next) => {
  return req.user ? mainRouter(req, res, next) : authRouter(req, res, next)
}))

// app.use(errorHandler)

app.listen(3000)