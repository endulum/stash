import express from 'express';
import asyncHandler from 'express-async-handler';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const prisma = new PrismaClient();

const upload = multer()

const router = express.Router();

const renderFileDashboard = asyncHandler(async (req, res) => {
  const folders = (await prisma.folder.findMany({
    where: {
      parentId: null
    },
  }))
  console.log(folders)
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
    prevForm: req.body,
    formErrors: req.formErrors,
    formMessage: req.formMessage
  })
})

const renderNewFolder = asyncHandler(async (req, res) => {
  res.render('layout', {
    page: 'pages/new-folder',
    title: 'Add New Folder',
    prevForm: req.body,
    formErrors: req.formErrors,
    formMessage: req.formMessage
  })
})

const handleFilePost = asyncHandler(async (req, res) => {
  console.log(req.body)
  console.log(req.file)
  return res.redirect('/files/new-file')
})

const handleFolderPost = asyncHandler(async (req, res) => {
  if (req.user === undefined) throw new Error('No User found.')
  await prisma.folder.create({
    data: {
      name: req.body.name,
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