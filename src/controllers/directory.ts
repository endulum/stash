import { type RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { ValidationChain, body } from "express-validator";

import prisma from '../prisma'
import buildFolderPath from '../functions/buildFolderPath'

const directory: {
  // does the folder exist?
  exists: RequestHandler,
  // does the folder belong to you?
  isYours: RequestHandler,
  // view a directory
  view: RequestHandler
  // view home directory
  viewHome: RequestHandler
} = {
  exists: asyncHandler(async (req, res, next) => {
    const folder = await prisma.folder.findUnique({
      where: { id: req.params.directoryId },
      include: { parent: true, children: true, files: true }
    })
    if (!folder) return res.status(404).render('layout', {
      page: 'pages/error',
      title: 'Folder Not Found',
      message: 'The folder you are looking for cannot be found.'
    })
    req.currentFolder = folder
    return next()
  }),

  isYours: asyncHandler(async (req, res, next) => {
    if (!req.user) {
      req.flash('You must be logged in to view folders.')
      return res.redirect('/login')
    }
    if (req.currentFolder.authorId !== req.user.id) return res.status(403).render('layout', {
      page: 'pages/error',
      title: 'Folder Not Yours',
      message: 'You cannot view folders that do not belong to you.'
    })
    return next()
  }),

  view: asyncHandler(async (req, res, next) => {
    const directoryPath = await buildFolderPath(req.currentFolder)
    return res.render('layout', {
      page: 'pages/directory',
      title: 'Your Files',
      directoryPath,
      currentFolder: req.currentFolder,
      parentFolder: req.currentFolder.parent,
      childFolders: req.currentFolder.children,
      childFiles: req.currentFolder.files
    })
  }),

  viewHome: asyncHandler(async (req, res, next) => {
    if (!req.user) {
      req.flash('You must be logged in to view folders.')
      return res.redirect('/login')
    }
    const childFolders = await prisma.folder.findMany({
      where: { authorId: req.user.id, parentId: null },
    })
    const childFiles = await prisma.file.findMany({
      where: { authorId: req.user.id, folderId: null }
    })
    return res.render('layout', {
      page: 'pages/directory',
      title: 'Your Files',
      directoryPath: [],
      currentFolder: null,
      parentFolder: null,
      childFolders,
      childFiles
    })
  })
}

export default directory