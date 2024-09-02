import express from 'express';
import asyncHandler from 'express-async-handler';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const prisma = new PrismaClient();

const upload = multer()

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

const renderFileDashboard = asyncHandler(async (req, res) => {
  const folders = (await prisma.folder.findMany({
    where: { parentId: null },
  }))
  res.render('layout', {
    page: 'pages/files',
    title: 'Your Files',
    folders
  })
})

const renderNewFile = asyncHandler(async (req, res) => {
  res.render('layout', {
    page: 'pages/new-file',
    title: 'Upload File',
    folderTree: await makeFolderTree(),
    prevForm: req.body,
    formErrors: req.formErrors,
    formMessage: req.formMessage
  })
})

const renderNewFolder = asyncHandler(async (req, res) => {
  res.render('layout', {
    page: 'pages/new-folder',
    title: 'Add New Folder',
    folderTree: await makeFolderTree(),
    prevForm: req.body,
    formErrors: req.formErrors,
    formMessage: req.formMessage
  })
})

const handleFilePost = asyncHandler(async (req, res) => {
  return res.redirect('/files/new-file')
})

const handleFolderPost = asyncHandler(async (req, res) => {
  if (req.user === undefined) throw new Error('No User found.')
  await prisma.folder.create({
    data: {
      name: req.body.name,
      parentId: req.body.location,
      authorId: req.user.id
    }
  })
  return res.redirect('/files')
})

router.route('/')
  .get(asyncHandler(async (req, res) => res.redirect('/files')));
router.route('/files')
  .get(renderFileDashboard)
router.route('/files/new-file')
  .get(renderNewFile)
  .post(upload.single('upload'), handleFilePost)
router.route('/files/new-folder')
  .get(renderNewFolder)
  .post(handleFolderPost)
// router.route('/files/:fileId')
//   .get(isFileYours, renderFileview)
//   .put(isFileYours, validateFileviewForm, handleFileviewForm)
//   .delete(isFileYours, handleFileDelete)
router.route('/logout')
  .get(asyncHandler(async (req, res, next) => {
    req.logOut((err) => {
      if (err) return next(err)
      return res.redirect('/')
    })
  }))

export default router;