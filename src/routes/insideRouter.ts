import express from 'express';
import asyncHandler from 'express-async-handler';

const router = express.Router();

router.route('/')
  .get(asyncHandler(async (req, res) => {
    res.render('layout', {
      page: 'pages/files',
      title: 'Your Files'
    })
  }))
//   .get(asyncHandler(async (req, res) => res.redirect('/files')))
// router.route('files')
//   .get(renderFileDashboard)
//   .post(validateFilePost, handleFilePost)
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