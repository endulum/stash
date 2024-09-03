import express from 'express';
import asyncHandler from 'express-async-handler';
import multer from 'multer';
import handleValidationErrors from '../middleware/handleValidationErrors';

import file from '../controllers/file'
import directory from '../controllers/directory'

const upload = multer();
const router = express.Router();

router.route('/')
  .get(asyncHandler(async (req, res) => res.redirect('/directory')))

router.route('/directory')
  .get(directory.viewHome)

router.route('/directory/:directoryId')
  .get(directory.exists, directory.isYours, directory.view)

router.route('/file/:fileId')
  .get(file.exists, file.isYours, file.view)

router.route('/new-file')
  .get(file.renderNew)
  .post(upload.single('upload'), file.validateNew, handleValidationErrors, file.submitNew)

router.route('/new-folder')
  .get(directory.renderNew)
  .post(directory.validateNew, handleValidationErrors, directory.submitNew)

router.route('/logout')
  .get(asyncHandler(async (req, res, next) => {
    req.logOut((err) => {
      if (err) return next(err)
        req.flash('alert', 'You have been logged out. See you soon!')
      return res.redirect('/login')
    })
  }))

export default router;