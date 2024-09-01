import express from 'express';
import asyncHandler from 'express-async-handler';
import multer from 'multer';

const upload = multer()

const router = express.Router();

const renderFileDashboard = asyncHandler(async (req, res) => {
  res.render('layout', {
    page: 'pages/files',
    title: 'Your Files'
  })
})

const renderFileUpload = asyncHandler(async (req, res) => {
  res.render('layout', {
    page: 'pages/upload',
    title: 'Upload File',
    prevForm: req.body,
    formErrors: req.formErrors,
    formMessage: req.formMessage
  })
})

const handleFilePost = asyncHandler(async (req, res) => {
  console.log(req.body)
  console.log(req.file)
  return res.redirect('/files/upload')
})

router.route('/')
  .get(asyncHandler(async (req, res) => res.redirect('/files')));
router.route('/files')
  .get(renderFileDashboard)
router.route('/files/upload')
  .get(renderFileUpload)
  .post(upload.single('upload'), handleFilePost)
  // .post(validateFilePost, handleFilePost)
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