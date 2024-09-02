import express from 'express';
import asyncHandler from 'express-async-handler';
import { Prisma, PrismaClient, type Folder } from '@prisma/client';
import multer from 'multer';

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
  let path: Array<{ name: string, id: null | string }> = []
  if ('directoryId' in req.params && req.params.directoryId) { 
    // we are looking for a folder with this id
    currentFolder = await prisma.folder.findUnique({
      where: { id: req.params.directoryId },
      include: { children: true }
    })
    if (currentFolder) {
      path = await makeFolderPath(currentFolder)
      childFolders = currentFolder.children
    }
  } else { 
    // we are at the home directory, we need all parentless files and folders
    childFolders = await prisma.folder.findMany({
      where: { parentId: null },
      // include: { files: true }
    })
  }
  
  return res.render('layout', {
    page: 'pages/directory',
    title: 'Your Files',
    currentFolder,
    childFolders,
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

const handleNewFile = asyncHandler(async (req, res) => {
  console.log(req.body)
  return res.redirect('/new-file')
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

const handleNewFolder = asyncHandler(async (req, res) => {
  console.log(req.body)
  return res.redirect('/new-folder')
})

router.route('/')
  .get(asyncHandler(async (req, res) => res.redirect('/directory')))
router.route(['/directory', '/directory/:directoryId'])
  .get(renderDirectory)
router.route('/new-file')
  .get(renderNewFile)
  .post(handleNewFile)
router.route('/new-folder')
  .get(renderNewFolder)
  .post(handleNewFolder)
router.route('/logout')
  .get(asyncHandler(async (req, res, next) => {
    req.logOut((err) => {
      if (err) return next(err)
      return res.redirect('/')
    })
  }))

export default router;