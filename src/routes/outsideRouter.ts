import express, { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import passport from 'passport';
import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const router = express.Router();

const renderLogin = asyncHandler(async (req, res, next) => {
  return res.render('layout', {
    page: 'pages/login',
    title: 'Log In',
    prevForm: req.body,
    formErrors: req.formErrors,
    formMessage: req.formMessage
  })
})

const validateLoginForm = [
  body('username')
    .trim()
    .notEmpty().withMessage('Please enter a username.')
    .escape(),
  body('password')
    .notEmpty().withMessage('Please enter a password.')
    .trim().escape()
]

const handleValidationErrors = asyncHandler(async (req, res, next) => {
  const errorsArray = validationResult(req).array()
  if (errorsArray.length > 0) {
    req.formErrors = {}
    errorsArray.forEach(error => {
      if (req.formErrors && error.type === 'field') 
        req.formErrors[error.path] = error.msg
    })
  }
  return next()
})

const handleLoginForm = asyncHandler(async (req, res, next) => {
  if (req.formErrors) return renderLogin(req, res, next)
  passport.authenticate('local', (err: Error, user: Express.User) => {
    if (err) return next(err)
    if (!user) {
      req.formErrors = { password: 'Incorrect username or password.' }
      return renderLogin(req, res, next)
    } else req.logIn(user, (err) => {
      if (err) return next(err)
      return res.redirect('/')
    })
  })(req, res, next)
})

const renderSignup = asyncHandler(async (req, res, next) => {
  return res.render('layout', {
    page: 'pages/signup',
    title: 'Sign Up',
    prevForm: req.body,
    formErrors: req.formErrors,
    formMessage: req.formMessage
  })
})

const validateSignupForm = [
  body('username')
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
    if (existingUser) throw new Error(
        'A user with this username already exists. Usernames must be unique.'
    )
  })
  .escape(),
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
  if (req.formErrors) return renderSignup(req, res, next)
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

router.route('/login')
  .get(renderLogin)
  .post(validateLoginForm, handleValidationErrors, handleLoginForm)
router.route('/signup')
  .get(renderSignup)
  .post(validateSignupForm, handleValidationErrors, handleSignupForm)
router.route('*')
  .all(asyncHandler(async (req, res) => res.redirect('/login')))

export default router;