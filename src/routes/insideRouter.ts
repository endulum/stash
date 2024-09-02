import express from 'express';
import asyncHandler from 'express-async-handler';
import { body } from 'express-validator';
import { Prisma, PrismaClient, type Folder } from '@prisma/client';
import multer from 'multer';
import handleValidationErrors from '../middleware/handleValidationErrors';

const prisma = new PrismaClient();
const upload = multer();
const router = express.Router();

async function makeFolderTree(): Promise<Array<{ name: string, id: null | string }>> {
  const queue: Array<{ name: string, id: null | string }> = [
    { name: '/', id: null }
  ]
  const results: Array<{ name: string, id: null | string }> = []
  do {
    const currentFolder = queue.pop()
    if (currentFolder) {
      results.push(currentFolder)
      const childFolders = await prisma.folder.findMany({
        where: { parentId: currentFolder.id }
      })
      if (childFolders.length > 0) {
        childFolders.forEach(child => {
          queue.push({ name: currentFolder.name + child.name + '/', id: child.id })
        })
      }
    }
  } while (queue.length > 0)
  return results
}

async function makeFolderPath(folder: Folder | null): Promise<Array<{ name: string, id: null | string }>> {
  let currentFolder: Folder | null = folder
  const folderPath: Array<{ name: string, id: null | string }> = []
  while (currentFolder) {
    folderPath.unshift({ name: currentFolder.name, id: currentFolder.id })
    const parentFolder = await prisma.folder.findUnique({
      where: { id: currentFolder.parentId || 'why doesnt this work with null?' }
    })
    currentFolder = parentFolder
  }
  return folderPath
}

const renderDirectory = asyncHandler(async (req, res, next) => {
  let currentFolder = null
  let childFolders = null
  let childFiles = null
  let path: Array<{ name: string, id: null | string }> = []
  if ('directoryId' in req.params && req.params.directoryId) {
    // we are looking for a folder with this id
    currentFolder = await prisma.folder.findUnique({
      where: { id: req.params.directoryId },
      include: { children: true, files: true }
    })
    if (currentFolder) {
      path = await makeFolderPath(currentFolder)
      childFolders = currentFolder.children
      childFiles = currentFolder.files
    }
  } else {
    // we are at the home directory, we need all parentless files and folders
    childFolders = await prisma.folder.findMany({
      where: { parentId: null },
    })
    childFiles = await prisma.file.findMany({
      where: { folderId: null }
    })
  }

  return res.render('layout', {
    page: 'pages/directory',
    title: 'Your Files',
    currentFolder,
    childFolders: childFolders || [],
    childFiles: childFiles || [],
    path,
  })
})

const renderNewFile = asyncHandler(async (req, res) => {
  res.render('layout', {
    page: 'pages/new-file',
    title: 'Upload File',
    folderTree: await makeFolderTree(),
    formErrors: req.formErrors,
  })
})

const locationValidation = body('location')
  .trim()
  .notEmpty().withMessage('Please choose a location for this file.').bail()
  .custom(async (value) => {
    if (value !== 'home') {
      const existingFolder = await prisma.folder.findUnique({
        where: { id: value }
      })
      return existingFolder
    }
    return true
  })
  .escape()

const validateNewFile = [
  upload.single('upload'),
  body('upload')
    .custom((value, { req }) => {
      if (!req.file) return false
      return true
    }).withMessage('Please upload a file.'),
  locationValidation
]

const validateNewFolder = [
  body('name')
    .trim()
    .notEmpty().withMessage('Please enter a name for this folder.').bail()
    .isLength({ max: 32 })
    .withMessage('Folder names cannot be longer than 64 characters.')
    .matches(/^[A-Za-z0-9-_]+$/g)
    .withMessage('Folder names must only consist of letters, numbers, hyphens, and underscores.'),
  locationValidation
]

const handleNewFile = asyncHandler(async (req, res, next) => {
  if (req.formErrors) return renderNewFile(req, res, next)
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
  return res.redirect(`/directory/${req.body.location === 'home' ? '' : req.body.location}`)
})

const renderNewFolder = asyncHandler(async (req, res) => {
  res.render('layout', {
    page: 'pages/new-folder',
    title: 'Add New Folder',
    folderTree: await makeFolderTree(),
    prevForm: req.body,
    formErrors: req.formErrors,
  })
})

const handleNewFolder = asyncHandler(async (req, res, next) => {
  console.log(req.body)
  if (req.formErrors) return renderNewFolder(req, res, next)
  if (!req.user) throw new Error('User does not exist.')
  const newFolder = await prisma.folder.create({
    data: { 
      name: req.body.name,
      parentId: req.body.location === 'home' ? null : req.body.location,
      authorId: req.user.id
    }
  })
  return res.redirect(`/directory/${newFolder.id}`)
  // consider: add flash for "successfully created" ?
})

router.route('/')
  .get(asyncHandler(async (req, res) => res.redirect('/directory')))

router.route(['/directory', '/directory/:directoryId'])
  .get(renderDirectory)

router.route('/new-file')
  .get(renderNewFile)
  .post(validateNewFile, handleValidationErrors, handleNewFile)

router.route('/new-folder')
  .get(renderNewFolder)
  .post(validateNewFolder, handleValidationErrors, handleNewFolder)

router.route('/logout')
  .get(asyncHandler(async (req, res, next) => {
    req.logOut((err) => {
      if (err) return next(err)
        req.flash('formMessage', 'You have been logged out. See you soon!')
      return res.redirect('/login')
    })
  }))

export default router;