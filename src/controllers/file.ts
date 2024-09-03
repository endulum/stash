import { type RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { ValidationChain, body } from "express-validator";
import type { File } from "@prisma/client";

import prisma from '../prisma'
import buildFolderTree from '../functions/buildFolderTree'
import buildFolderPath from "../functions/buildFolderPath";
import locationValidation from '../functions/locationValidation'

async function buildFilePath(file: File): Promise<Array<{ name: string, id: string | null }>> {
  let folderPath = null
  if (file.folderId !== null) {
    const parentFolder = await prisma.folder.findUnique({
      where: { id: file.folderId }
    })
    folderPath = await buildFolderPath(parentFolder)
    folderPath.push({ name: file.name, id: file.id })
  }
  return folderPath ?? [{ name: file.name, id: file.id }]
}

const file: {
  // does the file exist?
  exists: RequestHandler,
  // does the file belong to you?
  isYours: RequestHandler,
  // view a file
  view: RequestHandler,
  // create a file
  renderNew: RequestHandler,
  validateNew: ValidationChain[],
  submitNew: RequestHandler,
  // edit a file
  renderEdit: RequestHandler,
  validateEdit: ValidationChain[],
  submitEdit: RequestHandler,
  // delete a file
  renderDelete: RequestHandler,
  validateDelete: ValidationChain[],
  submitDelete: RequestHandler
} = {
  exists: asyncHandler(async (req, res, next) => {
    const file = await prisma.file.findUnique({
      where: { id: req.params.fileId }
    })
    if (!file) return res.status(404).render('layout', {
      page: 'pages/error',
      title: 'File Not Found',
      message: 'The file you are looking for cannot be found.'
    })
    req.currentFile = file
    return next()
  }),

  isYours: asyncHandler(async (req, res, next) => {
    if (!req.user) {
      req.flash('You must be logged in to view files.')
      return res.redirect('/login')
    }
    if (req.currentFile.authorId !== req.user.id) return res.status(403).render('layout', {
      page: 'pages/error',
      title: 'File Not Yours',
      message: 'You cannot view files that do not belong to you.'
    })
    return next()
  }),

  view: asyncHandler(async (req, res) => {
    const filePath = await buildFilePath(req.currentFile)
    return res.render('layout', {
      page: 'pages/view-file',
      title: `File Details`,
      directoryPath: filePath,
      file: req.currentFile
    })
  }),

  renderNew: asyncHandler(async (req, res) => {
    res.render('layout', {
      page: 'pages/new-file',
      title: 'Upload File',
      prevForm: req.body,
      folderTree: await buildFolderTree(),
      formErrors: req.formErrors,
    })
  }),

  validateNew: [
    body('upload')
      .custom(async (value, { req }) => {
        if (!req.file) throw new Error('Please upload a file.')
      }),
    locationValidation
  ],

  submitNew: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return file.renderNew(req, res, next)
    if (
      !req.file || !req.user
    ) throw new Error('Submitted file or current user is not defined.')
    const newFile = await prisma.file.create({
      data: {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        folderId: req.body.location === 'home' ? null : req.body.location,
        authorId: req.user.id
      }
    })
    req.flash('alert', 'New file successfully created.')
    return res.redirect(`/file/${newFile.id}`)
  }),

  renderEdit: asyncHandler(async (req, res) => {
    res.render('layout', {
      page: 'pages/edit-file',
      title: 'Edit File',
      currentFile: req.currentFile,
      folderTree: await buildFolderTree(),
      prevForm: {
        ...req.body,
        name: 'name' in req.body ? req.body.name : req.currentFile.name.split('.')[0]
      },
      formErrors: req.formErrors,
    })
  }),

  validateEdit: [
    body('name')
      .trim()
      .notEmpty().withMessage('Please enter a name for this file.').bail()
      .isLength({ max: 32 })
      .withMessage('Folder names cannot be longer than 64 characters.')
      .matches(/^[A-Za-z0-9-_]+$/g)
      .withMessage('Folder names must only consist of letters, numbers, hyphens, and underscores.'),
    locationValidation
  ],

  submitEdit: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return file.renderEdit(req, res, next)
    await prisma.file.update({
      where: { id: req.currentFile.id },
      data: {
        name: req.body.name,
        folderId: req.body.location === 'home' ? null : req.body.location,
      }
    })
    req.flash('alert', 'Your file has been successfully edited.')
    return res.redirect(`/file/${req.currentFile.id}`)
  }),

  renderDelete: asyncHandler(async (req, res) => {
    const filePath = (await buildFilePath(req.currentFile)).map(loc => loc.name).join('/')
    return res.render('layout', {
      page: 'pages/delete-file',
      title: 'Deleting File',
      file: req.currentFile,
      path: filePath,
      formErrors: req.formErrors
    })
  }),

  validateDelete: [
    body('path')
      .trim()
      .custom(async (value, { req }) => {
        const filePath = (await buildFilePath(req.currentFile)).map(loc => loc.name).join('/') // not very dry
        if (value !== filePath) throw new Error('Incorrect path.')
      })
      .escape()
  ],

  submitDelete: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return file.renderDelete(req, res, next)
    await prisma.file.delete({
      where: { id: req.currentFile.id }
    })
    req.flash('alert', 'File successfully deleted.')
    return res.redirect(`/directory/${req.currentFile.folderId ?? ''}`)
  })
}

export default file