import { type RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { ValidationChain, body } from "express-validator";
import bcrypt from 'bcryptjs'

import prisma from '../prisma'
import usernameValidation from '../functions/usernameValidation'

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