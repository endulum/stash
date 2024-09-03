import { type RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { ValidationChain, body } from "express-validator";
import prisma from '../prisma'

const file: {
  // does the file exist?
  exists: RequestHandler,
  // does the file belong to you?
  isYours: RequestHandler,
  // view a file
  view: RequestHandler,
  // // create a file
  // renderNew: RequestHandler,
  // validateNew: ValidationChain[],
  // submitNew: RequestHandler,
  // // edit a file
  // renderEdit: RequestHandler,
  // validateEdit: ValidationChain[],
  // submitEdit: RequestHandler,
  // // delete a file
  // renderDelete: RequestHandler,
  // submitDelete: RequestHandler
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
    return res.render('layout', {
      page: 'pages/view-file',
      title: `Viewing file: ${req.currentFile.name}`,
      file: req.currentFile
    })
  })
  // render: asyncHandler(),
  // validate: asyncHandler(),
  // submit: asyncHandler(),
}

export default file