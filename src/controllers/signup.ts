import { type RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { ValidationChain, body } from "express-validator";
import bcrypt from 'bcryptjs'
import prisma from '../prisma'

const signup: {
  render: RequestHandler,
  validate: ValidationChain[],
  submit: RequestHandler
} = {
  render: asyncHandler(async (req, res) => {
    return res.render('layout', {
      page: 'pages/signup',
      title: 'Sign Up',
      prevForm: req.body,
      formErrors: req.formErrors,
    })
  }),

  validate: [
    body('username')
    .trim()
    .notEmpty().withMessage('Please enter a username.').bail()
    .isLength({ min: 2, max: 32 })
    .withMessage('Usernames must be between 2 and 32 characters long.')
    .matches(/^[a-z0-9-]+$/g)
    .withMessage('Username must only consist of lowercase letters, numbers, and hyphens.')
    .custom(async (value, { req }) => {
      const existingUser = await prisma.user.findUnique({ where: { username: value } })
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
  ],

  submit: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return signup.render(req, res, next)
    bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
      if (err) throw new Error(err.message)
      await prisma.user.create({
        data: {
          username: req.body.username,
          password: hashedPassword
        }
      })
    })
    req.flash('success', 'Your account has been successfully created.')
    req.flash('loginUsernamePrefill', req.body.username)
    return res.redirect('/login')
  })
}

export default signup