import express from 'express';
import asyncHandler from 'express-async-handler';

const router = express.Router();

router.route('/')
  .get(asyncHandler(async (req, res) => {
    res.send('logged in')
  }))

// AUTHENTICATED
// router.route('/')
//   .get(asyncHandler(async (req, res) => res.redirect('/files')))
// router.route('files')
//   .get(renderFileDashboard)
//   .post(validateFilePost, handleFilePost)
// router.route('/files/:fileId')
//   .get(isFileYours, renderFileview)
//   .put(isFileYours, validateFileviewForm, handleFileviewForm)
//   .delete()

export default router;