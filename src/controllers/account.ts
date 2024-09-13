import { type RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { ValidationChain, body } from "express-validator";
import bcrypt from 'bcryptjs'

import prisma from '../prisma'
import usernameValidation from '../functions/usernameValidation'

export const validation: Record<string, ValidationChain[]> = {
  forUpdate: [
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
      .escape(),

    body('currentPassword')
      .trim()
      .custom(async (value, { req }) => {
        if (req.body.password !== '' && value.length === 0)
          throw new Error('Please enter your current password in order to change it.')
      })
      .escape()
  ]
}

export const controller: Record<string, RequestHandler> = {
  renderUpdate: asyncHandler(async (req, res) => {
    if (!req.user) {
      req.flash('warning', 'You must be logged in to edit your account details.')
      return res.redirect('/login')
    }
    return res.render('layout', {
      page: 'pages/update/update-account',
      title: 'Account Settings',
      prevForm: {
        ...req.body,
        username: req.body.username ?? req.user.username
      },
      formErrors: req.formErrors,
    })
  }),

  submitUpdate: asyncHandler(async (req, res, next) => {
    if (req.user === undefined) {
      req.flash('warning', 'You must be logged in to edit your account details.')
      return res.redirect('/login')
    }
    if (req.formErrors) return controller.renderUpdate(req, res, next);
    if (req.body.password !== '') {
      const match = await bcrypt.compare(req.body.currentPassword, req.user.password)
      if (!match) {
        req.formErrors = { currentPassword: 'Incorrect password.' }
        return controller.renderUpdate(req, res, next);
      }
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
    req.flash('success', 'Your account details have been successfully saved.')
    return res.redirect('/account')
  })
}