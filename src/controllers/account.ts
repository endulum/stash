import { type RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { ValidationChain, body } from "express-validator";
import bcrypt from 'bcryptjs'

import prisma from '../prisma'
import supabase from "../supabase";
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
  ],

  forDelete: [
    body('password')
      .trim()
      .notEmpty().withMessage('Please input your password.').bail()
      .custom(async (value, { req }) => {
        const result = await bcrypt.compare(value, req.user.password)
        if (!result) throw new Error('Incorrect password.')
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
  }),

  renderDelete: asyncHandler(async (req, res) => {
    if (!req.user) {
      req.flash('warning', 'You must be logged in to delete your account.')
      return res.redirect('/login')
    }
    return res.render('layout', {
      page: 'pages/delete/delete-account',
      title: 'Deleting Account',
      formErrors: req.formErrors
    })
  }),

  submitDelete: asyncHandler(async (req, res, next) => {
    if (req.user === undefined) {
      req.flash('warning', 'You must be logged in to delete your account.')
      return res.redirect('/login')
    }
    if (req.formErrors) return controller.renderDelete(req, res, next);

    // delete all files belonging to this user
    const allFilesOfUser = await prisma.file.findMany({
      where: { authorId: req.user.id }
    })
    if (allFilesOfUser.length > 0) {
      const { data, error } = await supabase.storage
        .from('uploader')
        .remove(allFilesOfUser.map(file => file.id))
      if (error) console.error(error);
    }

    // delete user entry - the Directory and File entries will cascade deletion
    await prisma.user.delete({
      where: { id: req.user.id }
    })

    req.logOut((err) => {
      if (err) return next(err)
      req.flash('success', 'Your account and its content has been successfully deleted.')
      return res.redirect('/signup')
    })
  })
}