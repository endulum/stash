import { type RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { ValidationChain, body } from "express-validator";
import type { Folder } from "@prisma/client";
import fs from 'fs'
import stream from "stream";
import streamBuffers from 'stream-buffers'
import archiver from 'archiver'
import Zip from 'adm-zip'

import supabase from "../supabase";
import prisma from '../prisma'
import buildFolderPath from '../functions/buildFolderPath'
import buildFolderTree from "../functions/buildFolderTree";
import locationValidation from "../functions/locationValidation";

async function buildZip(folder: Folder): Promise<Buffer> {
  const zip = new Zip()

  const folderTree = await buildFolderTree(folder)
  for (let folderDetails of folderTree) {
    if (!folderDetails.id) break;
    const currentFolder = await prisma.folder.findUnique({
      where: { id: folderDetails.id },
      include: { files: true, children: true }
    })
    if (!currentFolder) break;
    if (currentFolder.files.length === 0 && currentFolder.children.length === 0) {
      zip.addFile(folderDetails.name + '/.keep', Buffer.from(''))
    }
    for (let file of currentFolder.files) {
      const { data, error } = await supabase.storage
        .from('uploader')
        .download(file.id)
      if (error) {
        console.error(error)
        throw new Error('Problem downloading this file.')
      } else {
        const buffer = Buffer.from(await data.arrayBuffer())
        zip.addFile(folderDetails.name + file.name + '.' + file.ext, buffer)
      }
    }
  }
  const buffer = zip.toBuffer()
  return buffer
}

const directory: {
  // does the folder exist?
  exists: RequestHandler,
  // does the folder belong to you?
  isYours: RequestHandler,
  // view a directory
  view: RequestHandler,
  // download a directory
  download: RequestHandler,
  // view home directory
  viewHome: RequestHandler,
  // create a directory
  renderNew: RequestHandler,
  validate: ValidationChain[],
  submitNew: RequestHandler
  // edit a directory
  renderEdit: RequestHandler,
  submitEdit: RequestHandler,
  // // delete a directory
  renderDelete: RequestHandler,
  validateDelete: ValidationChain[],
  submitDelete: RequestHandler
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

  download: asyncHandler(async (req, res) => {
    try {
      const buffer = await buildZip(req.currentFolder)
      const readStream = new stream.PassThrough()
      readStream.end(buffer)
      res.set(
        'Content-disposition', 
        'attachment; filename=' + `${req.currentFolder.name}.zip`
      )
      res.set('Content-Type', 'application/x-zip-compressed')
      readStream.pipe(res)
    } catch (err) {
      console.error(err)
      req.flash('alert', 'Sorry, there was a problem downloading your folder.')
      return res.redirect(`/directory/${req.currentFolder.id}`)
    }
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
  }),

  renderNew: asyncHandler(async (req, res) => {
    res.render('layout', {
      page: 'pages/new-folder',
      title: 'Add New Folder',
      folderTree: await buildFolderTree(),
      //preDest: req.query.dest,
      prevForm: req.body,
      formErrors: req.formErrors,
    })
  }),

  validate: [
    body('name')
      .trim()
      .notEmpty().withMessage('Please enter a name for this folder.').bail()
      .isLength({ max: 32 })
      .withMessage('Folder names cannot be longer than 64 characters.')
      .matches(/^[A-Za-z0-9-_ ]+$/g)
      .withMessage('Folder names must only consist of letters, numbers, hyphens, underscores, and spaces.'),
    locationValidation
  ],

  submitNew: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return directory.renderNew(req, res, next)
    if (!req.user) throw new Error('User is not defined.')
    const newFolder = await prisma.folder.create({
      data: { 
        name: req.body.name,
        parentId: req.body.location === 'home' ? null : req.body.location,
        authorId: req.user.id
      }
    })
    req.flash('alert', 'New folder successfully created.')
    return res.redirect(`/directory/${newFolder.id}`)
  }),

  renderEdit: asyncHandler(async (req, res) => {
    return res.render('layout', {
      page: 'pages/edit-folder',
      title: 'Editing Folder',
      currentFolder: req.currentFolder,
      folderTree: (await buildFolderTree()).filter(loc => loc.id !== req.currentFolder.id),
      prevForm: {
        ...req.body,
        name: 'name' in req.body ? req.body.name : req.currentFolder.name,
        location: 'location' in req.body ? req.body.location : req.currentFolder.parentId
      },
      formErrors: req.formErrors,
    })
  }),

  submitEdit: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return directory.renderEdit(req, res, next)
    await prisma.folder.update({
      where: { id: req.currentFolder.id },
      data: {
        name: req.body.name,
        parentId: req.body.location === 'home' ? null : req.body.location,
      }
    })
    req.flash('alert', 'Your folder has been successfully edited.')
    return res.redirect(`/directory/${req.currentFolder.id}`)
  }),

  renderDelete: asyncHandler(async (req, res) => {
    const folderPath = (await buildFolderPath(req.currentFolder)).map(loc => loc.name).join('/') + '/'
    return res.render('layout', {
      page: 'pages/delete-folder',
      title: 'Deleting Folder',
      folder: req.currentFolder,
      path: folderPath,
      formErrors: req.formErrors
    })
  }),

  validateDelete: [
    body('path')
      .trim()
      .custom(async (value, { req }) => {
        const folderPath = (await buildFolderPath(req.currentFolder)).map(loc => loc.name).join('/') + '/'
        if (value !== folderPath) throw new Error('Incorrect path.')
      })
      .escape()
  ],

  submitDelete: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return directory.renderDelete(req, res, next)
    await prisma.folder.delete({
      where: { id: req.currentFolder.id }
    })
    req.flash('alert', 'Folder successfully deleted.')
    return res.redirect(`/directory/${req.currentFolder.parentId ?? ''}`)
  })
}

export default directory