import { RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { body, type ValidationChain } from "express-validator";
import stream from "stream";

import prisma from '../prisma'
import supabase from "../supabase";

import createDirectoryTree from "../functions/createDirectoryTree";
import createPath from "../functions/createPath";
import findAllFilesOfDirectory from '../functions/findAllFilesOfDirectory'
import buildZipFromDirectory from '../functions/buildZipFromDirectory'
import locationValidation from "../functions/locationValidation";

export const validation: Record<string, ValidationChain[]> = {
  forCreateOrUpdate: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Please enter a name for this directory.').bail()
      .isLength({ max: 32 })
      .withMessage('Directory names cannot be longer than 64 characters.').bail()
      .matches(/^[A-Za-z0-9-_ ]+$/g)
      .withMessage('Directory names must only consist of letters, numbers, hyphens, underscores, and spaces.').bail()
      .custom(async (value, { req }) => {
        const duplicateDirectory = await prisma.directory.findFirst({
          where: {
            name: value,
            parentId: 'location' in req.body
              ? req.body.location
              : req.currentDirectory.parentId
          }
        })
        if (duplicateDirectory && duplicateDirectory.id !== req.currentDirectory.id)
          throw new Error('There already exists a directory in the chosen location with this name. Directories in the same location cannot have the same name.')
      })
      .escape(),
    locationValidation
  ],

  forDelete: [
    body('path')
      .trim()
      .custom(async (value, { req }) => {
        const path = (await createPath(req.currentDirectory))
          .map(loc => loc.name).join('/') + '/'
        if (value !== path) throw new Error('Incorrect path.')
      })
      .escape()
  ]
}

export const controller: Record<string, RequestHandler> = {
  exists: asyncHandler(async (req, res, next) => {
    const directory = await prisma.directory.findUnique({
      where: { id: req.params.directoryId ?? '' },
      include: { files: true, directories: true, parent: true }
    })
    if (!directory) return res.status(404).render('layout', {
      page: 'pages/error',
      title: 'Directory Not Found',
      message: 'The directory you requested could not be found.'
    })
    req.currentDirectory = directory
    return next()
  }),

  isYours: asyncHandler(async (req, res, next) => {
    if (!req.user) {
      req.flash('You must be logged in to view directories.')
      return res.redirect('/login')
    }
    if (req.currentDirectory.authorId !== req.user.id) return res.status(403).render('layout', {
      page: 'pages/error',
      title: 'Directory Not Yours',
      message: 'You cannot access directories that do not belong to you.'
    })
    return next()
  }),

  isShared: asyncHandler(async (req, res, next) => {
    const sharedDirectory = await prisma.directory.findUnique({
      where: {
        id: req.params.sharedDirectoryId ?? '',
        AND: [
          { shareUntil: { not: null } },
          { shareUntil: { gte: new Date() } }
        ]
      },
      include: { directories: true, files: true }
    })

    if (!sharedDirectory) return res.status(404).render('layout', {
      page: 'pages/error',
      title: 'Shared Directory Not found',
      message: 'The shared directory you are looking for cannot be found.'
    })

    if (req.user && sharedDirectory.authorId === req.user.id)
      return res.redirect('/directory/' + sharedDirectory.id)

    req.sharedDirectory = sharedDirectory
    return next()
  }),

  hasSharedRoot: asyncHandler(async (req, res, next) => {
    let path: Array<{ name: string, id: string | null }> = []
    if (req.currentDirectory) {
      if (req.currentDirectory.id === req.sharedDirectory.id)
        return res.redirect('/share/' + req.currentDirectory.id)
      path = await createPath(req.currentDirectory)
      const sharedRoot = path.find(loc => loc.id === req.sharedDirectory.id)
      if (!sharedRoot)
        return res.redirect('/directory/' + req.currentDirectory.id)
      path = path.slice(
        path.indexOf(sharedRoot) + 1,
        path.length
      )
    }
    req.pathToSharedRoot = path
    return next()
  }),

  renderRead: asyncHandler(async (req, res) => {
    let path: Array<{ name: string, id: string | null }> = []
    if (req.currentDirectory) path = await createPath(req.currentDirectory)
    return res.render('layout', {
      page: 'pages/read/read-directory',
      title: 'Your Files',
      path,
      currentDirectory: req.currentDirectory,
      files: req.currentDirectory 
        ? req.currentDirectory.files
        : await prisma.file.findMany({ where: { directoryId: null } }),
      directories: req.currentDirectory
        ? req.currentDirectory.directories
        : await prisma.directory.findMany({ where: { parentId: null } })
    })
  }),

  renderReadShared: asyncHandler(async (req, res) => {
    return res.render('layout', {
      page: 'pages/read/read-shared-directory',
      title: 'Shared Directory',
      path: req.pathToSharedRoot ?? [],
      currentDirectory: req.currentDirectory,
      sharedDirectory: req.sharedDirectory,
      files: req.currentDirectory 
        ? req.currentDirectory.files
        : req.sharedDirectory.files,
      directories: req.currentDirectory
        ? req.currentDirectory.directories
        : req.sharedDirectory.directories
    })
  }),

  renderCreate: asyncHandler(async (req, res) => {
    res.render('layout', {
      page: 'pages/create/create-directory',
      title: 'Add New Directory',
      directoryTree: await createDirectoryTree(),
      prevForm: req.body,
      formErrors: req.formErrors,
    })
  }),

  submitCreate: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return controller.renderCreate(req, res, next)
    if (!req.user) {
      req.flash('You must be logged in to create directories.')
      return res.redirect('/login')
    }
    const newDirectory = await prisma.directory.create({
      data: {
        name: req.body.name,
        parentId: req.body.location === 'home' ? null : req.body.location,
        authorId: req.user.id
      }
    })
    req.flash('alert', 'New directory successfully created.')
    return res.redirect(`/directory/${newDirectory.id}`)
  }),

  renderUpdate: asyncHandler(async (req, res) => {
    return res.render('layout', {
      page: 'pages/update/update-directory',
      title: 'Editing Directory',
      currentDirectory: req.currentDirectory,
      directoryTree: (await createDirectoryTree())
        .filter(loc => loc.id !== req.currentDirectory.id),
      prevForm: {
        ...req.body,
        name: 'name' in req.body ? req.body.name : req.currentDirectory.name,
        location: 'location' in req.body ? req.body.location : req.currentDirectory.parentId,
        shareUntil: 'shareUntil' in req.body
          ? req.body.shareUntil
          : req.currentDirectory.shareUntil?.toISOString().substring(0, 10)
      },
      formErrors: req.formErrors
    })
  }),

  submitUpdate: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return controller.renderUpdate(req, res, next)
    await prisma.directory.update({
      where: { id: req.currentDirectory.id },
      data: {
        name: req.body.name,
        parentId: req.body.location === 'home' ? null : req.body.location,
        shareUntil: req.body.shareUntil === '' ? null : new Date(req.body.shareUntil)
      }
    })
    req.flash('alert', 'Your directory has been successfully edited.')
    return res.redirect(`/directory/${req.currentDirectory.id}`)
  }),

  renderDelete: asyncHandler(async (req, res) => {
    return res.render('layout', {
      page: 'pages/delete/delete-directory',
      title: 'Deleting Directory',
      currentDirectory: req.currentDirectory,
      path: (await createPath(req.currentDirectory))
        .map(loc => loc.name).join('/') + '/',
      formErrors: req.formErrors
    })
  }),

  submitDelete: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return controller.renderDelete(req, res, next)
    const filesToDelete = await findAllFilesOfDirectory(req.currentDirectory)
    if (filesToDelete.length > 0) {
      const { data, error } = await supabase.storage
        .from('uploader')
        .remove(filesToDelete)
      if (error) {
        console.error(error)
        req.flash('alert', 'Sorry, there was a problem deleting your directory.')
        return res.redirect(`/directory/${req.currentDirectory.id}/delete`)
      }
    }
    await prisma.directory.delete({
      where: { id: req.currentDirectory.id }
    })
    req.flash('alert', 'Directory successfully deleted.')
    return res.redirect(`/directory/${req.currentDirectory.parentId ?? ''}`)
  }),

  download: asyncHandler(async (req, res) => {
    if (req.sharedDirectory && !req.currentDirectory) {
      req.currentDirectory = { ...req.sharedDirectory, parent: null }
    }
    try {
      const buffer = await buildZipFromDirectory(req.currentDirectory)
      const readStream = new stream.PassThrough()
      readStream.end(buffer)
      res.set(
        'Content-disposition',
        'attachment; filename=' + `${req.currentDirectory.name}.zip`
      )
      res.set('Content-Type', 'application/x-zip-compressed')
      readStream.pipe(res)
    } catch (err) {
      console.error(err)
      req.flash('alert', 'Sorry, there was a problem downloading this directory.')
      if (req.sharedDirectory) {
        return res.redirect(
          '/share/' + req.sharedDirectory.id
          + (req.currentDirectory ? ('/directory/' + req.currentDirectory.id) : '')
        )
      } else return res.redirect('/directory/' + req.currentDirectory.id)
    }
  })
}