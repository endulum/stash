import { type RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { body, type ValidationChain } from "express-validator";
import { decode } from "base64-arraybuffer";
import stream from "stream";

import prisma from '../prisma'
import supabase from '../supabase'

import createPath, { createFilePath } from "../functions/createPath";
import createDirectoryTree from "../functions/createDirectoryTree";
import locationValidation from "../functions/locationValidation";

export const validation: Record<string, ValidationChain[]> = {
  forCreate: [
    body('upload')
      .custom(async (value, { req }) => {
        if (!req.file) throw new Error('Please upload a file.')
        const duplicateFile = await prisma.file.findFirst({
          where: {
            name: req.file.originalname.substring(
              0,
              req.file.originalname.lastIndexOf('.'),
            ),
            directoryId: 'location' in req.body
              ? req.body.location
              : req.currentFile.directoryId
          }
        })
        if (duplicateFile)
          throw new Error('There already exists a file in the chosen location with this name. Files in the same location cannot have the same name. Try changing the name of the file you are uploading, and upload it again.')
      }),
    locationValidation
  ],

  forUpdate: [
    body('name')
      .trim()
      .notEmpty().withMessage('Please enter a name for this file.').bail()
      .isLength({ max: 32 })
      .withMessage('File names cannot be longer than 64 characters.')
      .matches(/^[A-Za-z0-9-._ ]+$/g)
      .withMessage('File names must only consist of letters, numbers, hyphens, underscores, dots, and spaces.')
      .custom(async (value, { req }) => {
        const duplicateFile = await prisma.file.findFirst({
          where: {
            name: value,
            directoryId: 'location' in req.body
              ? req.body.location
              : req.currentFile.directoryId
          }
        })
        if (duplicateFile && duplicateFile.id !== req.currentFile.id)
          throw new Error('There already exists a file in the chosen location with this name. Files in the same location cannot have the same name.')
      })
      .escape(),
    locationValidation
  ],

  forDelete: [
    body('path')
      .trim()
      .custom(async (value, { req }) => {
        const filePath = (await createFilePath(req.currentFile)).map(loc => loc.name).join('/')
        if (value !== filePath) throw new Error('Incorrect path.')
      })
      .escape()
  ]
}

export const controller: Record<string, RequestHandler> = {
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
      req.flash('warning', 'You must be logged in to view files.')
      return res.redirect('/login')
    }
    if (req.currentFile.authorId !== req.user.id) return res.status(403).render('layout', {
      page: 'pages/error',
      title: 'File Not Yours',
      message: 'You cannot view files that do not belong to you.'
    })
    return next()
  }),

  hasSharedRoot: asyncHandler(async (req, res, next) => {
    let path = await createFilePath(req.currentFile)
    const sharedRoot = path.find(loc => loc.id === req.sharedDirectory.id)
    if (!sharedRoot)
      return res.redirect('/file/' + req.currentFile.id)
    path = path.slice(
      path.indexOf(sharedRoot) + 1,
      path.length
    )
    req.pathToSharedRoot = path
    return next()
  }),

  renderRead: asyncHandler(async (req, res) => {
    const path = await createFilePath(req.currentFile)
    return res.render('layout', {
      page: 'pages/read/read-file',
      title: 'Viewing File',
      path,
      file: req.currentFile
    })
  }),

  renderReadShared: asyncHandler(async (req, res) => {
    return res.render('layout', {
      page: 'pages/read/read-shared-file',
      title: 'Viewing Shared File',
      path: req.pathToSharedRoot,
      sharedDirectory: req.sharedDirectory,
      file: req.currentFile
    })
  }),

  renderCreate: asyncHandler(async (req, res) => {
    res.render('layout', {
      page: 'pages/create/create-file',
      title: 'Upload File',
      prevForm: req.body,
      directoryTree: await createDirectoryTree(),
      formErrors: req.formErrors,
    })
  }),

  submitCreate: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return controller.renderCreate(req, res, next)
    if (!req.user) {
      req.flash('warning', 'You must be logged in to upload files.')
      return res.redirect('/login')
    }
    if (!req.file) {
      req.flash('warning', 'Somehow, no file upload was provided. Try again?')
      return controller.renderCreate(req, res, next)
    }

    // first, parse out the file extension
    let newFileExt: string | null = null
    let newFileName: string = req.file.originalname
    if (req.file.originalname.lastIndexOf('.') > 0) {
      newFileExt = req.file.originalname.substring(
        req.file.originalname.lastIndexOf('.') + 1,
        req.file.originalname.length
      ).toLowerCase()
      newFileName = req.file.originalname.substring(
        0,
        req.file.originalname.lastIndexOf('.'),
      )
    }

    // then, create the file entry in the database
    const newFile = await prisma.file.create({
      data: {
        name: newFileName,
        ext: newFileExt,
        type: req.file.mimetype,
        size: req.file.size,
        directoryId: req.body.location === 'home' ? null : req.body.location,
        authorId: req.user.id
      }
    })

    // then, attempt an upload to supabase. 
    // we need a unique id pertaining to the created file entry,
    // hence the file entry needed to be inserted first
    const fileBase64 = decode(req.file.buffer.toString('base64'))
    const { data, error } = await supabase.storage
      .from('uploader')
      .upload(newFile.id, fileBase64, { contentType: req.file.mimetype });

    // delete the file entry if something goes wrong.
    if (error) {
      console.error(error)
      await prisma.file.delete({ where: { id: newFile.id } })
      req.flash('warning', 'Sorry, something went wrong when uploading your file.')
      return res.redirect('/new-file')
    } else { // yay nothing went wrong!
      const publicUrl = supabase.storage
        .from('uploader')
        .getPublicUrl(data?.path as string).data.publicUrl
      await prisma.file.update({
        where: { id: newFile.id },
        data: { url: publicUrl }
      })
      req.flash('success', 'New file successfully created.')
      return res.redirect(`/file/${newFile.id}`)
    }
  }),

  renderUpdate: asyncHandler(async (req, res) => {
    res.render('layout', {
      page: 'pages/update/update-file',
      title: 'Edit File',
      currentFile: req.currentFile,
      directoryTree: await createDirectoryTree(),
      prevForm: {
        ...req.body,
        name: 'name' in req.body ? req.body.name : req.currentFile.name
      },
      formErrors: req.formErrors,
    })
  }),

  submitUpdate: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return controller.renderUpdate(req, res, next)
    await prisma.file.update({
      where: { id: req.currentFile.id },
      data: {
        name: req.body.name,
        directoryId: req.body.location === 'home' ? null : req.body.location,
      }
    })
    req.flash('success', 'Your file has been successfully edited.')
    return res.redirect(`/file/${req.currentFile.id}`)
  }),

  renderDelete: asyncHandler(async (req, res) => {
    const filePath = (await createFilePath(req.currentFile)).map(loc => loc.name).join('/')
    return res.render('layout', {
      page: 'pages/delete/delete-file',
      title: 'Deleting File',
      file: req.currentFile,
      path: filePath,
      formErrors: req.formErrors
    })
  }),

  submitDelete: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return controller.renderDelete(req, res, next)
    const { data, error } = await supabase.storage
      .from('uploader')
      .remove([req.currentFile.id])
    if (error) {
      console.error(error)
      req.flash('warning', 'Sorry, there was a problem deleting your file.')
      return res.redirect(`/file/${req.currentFile.directoryId}/delete`)
    } else {
      await prisma.file.delete({
        where: { id: req.currentFile.id }
      })
      req.flash('success', 'File successfully deleted.')
      return res.redirect(`/directory/${req.currentFile.directoryId ?? ''}`)
    }
  }),

  download: asyncHandler(async (req, res) => {
    const { data, error } = await supabase.storage
      .from('uploader')
      .download(req.currentFile.id)
    if (error) {
      req.flash('warning', 'Sorry, there was a problem downloading your file.')
      return res.redirect(`/file/${req.currentFile.id}`)
    } else {
      const filename = req.currentFile.name + '.' + req.currentFile.ext
      const buffer = Buffer.from(await data.arrayBuffer())
      const readStream = new stream.PassThrough()
      readStream.end(buffer)
      res.set('Content-disposition', 'attachment; filename=' + filename)
      res.set('Content-Type', req.currentFile.type)
      readStream.pipe(res)
    }
  }),
}