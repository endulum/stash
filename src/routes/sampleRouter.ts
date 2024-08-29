import express from 'express';
import asyncHandler from 'express-async-handler';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import handleValidationErrors from '../middleware/handleValidationErrors';

const prisma = new PrismaClient()

const authenticateUser = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    req.formMessage = 'You must be logged in to view this page.'
    return renderLogin(req, res, next)
  }
  return next()
})

const renderIndex = asyncHandler(async (req, res) => {
  return res.render('sample/index', {
    user: req.user
  })
})

const renderLogin = asyncHandler(async (req, res) => {
  return res.render('sample/login', {
    formMessage: req.formMessage,
    inputErrors: req.inputErrors,
    prevInputs: req.body
  })
})

const validateLoginForm = [
  body('username')
    .trim().escape(),
  body('password')
    .trim().escape()
]

const handleLoginForm = asyncHandler(async (req, res, next) => {
  passport.authenticate('local', (err: Error, user: Express.User) => {
    if (err) return next(err)
    if (!user) {
      req.inputErrors = ['Incorrect username or password.']
      return next()
    } else req.logIn(user, (err) => {
      if (err) return next(err)
      return res.redirect('/')
    })
  })(req, res, next)
})

const renderSignup = asyncHandler(async (req, res) => {
  return res.render('sample/signup', {
    inputErrors: req.inputErrors,
    prevInputs: req.body
  })
})

const usernameValidation = body('username')
  .trim()
  .notEmpty().withMessage('Please enter a username.').bail()
  .isLength({ min: 2, max: 32 })
  .withMessage('Usernames must be between 2 and 32 characters long.')
  .matches(/^[a-z0-9-]+$/g)
  .withMessage('Username must only consist of lowercase letters, numbers, and hyphens.')
  .custom(async (value, { req }) => {
    const existingUser = await prisma.user.findUnique({
      where: {
        username: value
      }
    })
    if (existingUser && 'user' in req && existingUser.id !== req.user.id)
      throw new Error(
        'A user with this username already exists. Usernames must be unique.'
      )
  })
  .escape()

const validateSignupForm = [
  usernameValidation,
  body('password')
    .trim()
    .notEmpty().withMessage('Please enter a password.').bail()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .escape(),
  body('confirmPassword')
    .trim()
    .notEmpty().withMessage('Please confirm your password.').bail()
    .custom(async (value, { req }) => {
      if (value !== req.body.password) throw new Error('Both passwords do not match.')
    })
    .escape()
]

const handleSignupForm = asyncHandler(async (req, res, next) => {
  if (req.inputErrors !== undefined && req.inputErrors.length > 0) return next()
  bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
    if (err) throw new Error(err.message)
    await prisma.user.create({
      data: {
        username: req.body.username,
        password: hashedPassword
      }
    })
  })
  req.formMessage = 'Your account has been created. Log into your account below.'
  return renderLogin(req, res, next)
})

const logOut = asyncHandler(async (req, res, next) => {
  req.logOut((err) => {
    if (err) return next(err)
    return res.redirect('/')
  })
})

const renderAdmin = asyncHandler(async (req, res) => {
  if (req.user !== undefined && req.user.role === 'ADMIN') {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true
      },
      orderBy: {
        id: 'asc'
      }
    })
    return res.render('sample/admin', { users })
  }
  return res.status(403).render('sample/error', {
    code: 403,
    message: 'You are not an admin, and are not permitted to access this page.'
  })
})

const renderAccount = asyncHandler(async (req, res) => {
  if (req.user === undefined) throw new Error('No user was logged in.')
  return res.render('sample/account', {
    formMessage: req.formMessage,
    inputErrors: req.inputErrors,
    prevInputs: {
      ...req.body,
      username: 'username' in req.body ? req.body.username : req.user.username
    }
  })
})

const validateAccountForm = [
  usernameValidation,
  body('password')
    .trim()
    .custom(async value => {
      if (value.length > 0 && value.length < 8)
        throw new Error('New password must be 8 or more characters long.')
    })
    .escape(),
  body('confirmPassword')
    .trim()
    .custom(async (value, { req }) => {
      if (req.body.password !== '' && value.length === 0)
        throw new Error('Please confirm your new password.')
    }).bail()
    .custom(async (value, { req }) => {
      if (value !== req.body.password) throw new Error('Both passwords do not match.')
    })
    .escape()
]

const handleAccountForm = asyncHandler(async (req, res, next) => {
  if (req.user === undefined) throw new Error('No user was logged in.')
  if (req.inputErrors !== undefined && req.inputErrors.length > 0) return next()
  if (req.body.password !== '') {
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(req.body.password, salt)
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        username: req.body.username,
        password: hashedPassword
      }
    })
  } else await prisma.user.update({
    where: { id: req.user.id },
      data: {
        username: req.body.username,
      }
  })
  req.formMessage = 'Your changes have been successfully saved.'
  return renderAccount(req, res, next)
})

const sampleRouter = express.Router()
sampleRouter.route('/')
  .get(renderIndex)
sampleRouter.route('/login')
  .get(renderLogin)
  .post(validateLoginForm, handleLoginForm, renderLogin)
sampleRouter.route('/signup')
  .get(renderSignup)
  .post(validateSignupForm, handleValidationErrors, handleSignupForm, renderSignup)
sampleRouter.route('/logout')
  .get(logOut)
sampleRouter.route('/admin')
  .get(authenticateUser, renderAdmin)
sampleRouter.route('/account')
  .get(authenticateUser, renderAccount)
  .post(authenticateUser, validateAccountForm, handleValidationErrors, handleAccountForm, renderAccount)

export default sampleRouter