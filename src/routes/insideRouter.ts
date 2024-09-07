import express from 'express';
import asyncHandler from 'express-async-handler';
import multer from 'multer';

import handleValidationErrors from '../middleware/handleValidationErrors';
import file from '../controllers/file'
import directory from '../controllers/directory'

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const router = express.Router();

router.route(['/', '/login', '/signup'])
  .get(asyncHandler(async (req, res) => res.redirect('/directory')))

router.route('/directory')
  .get(directory.viewHome)

router.route('/directory/:directoryId')
  .get(directory.exists, directory.isYours, directory.view)

router.route('/directory/:directoryId/download')
  .get(directory.exists, directory.isYours, directory.download)

router.route('/directory/:directoryId/edit')
  .get(directory.exists, directory.isYours, directory.renderEdit)
  .post(directory.exists, directory.isYours, directory.validate, handleValidationErrors, directory.submitEdit)

router.route('/directory/:directoryId/delete')
  .get(directory.exists, directory.isYours, directory.renderDelete)
  .post(directory.exists, directory.isYours, directory.validateDelete, handleValidationErrors, directory.submitDelete)

router.route('/file/:fileId')
  .get(file.exists, file.isYours, file.view)

router.route('/file/:fileId/download')
  .get(file.exists, file.isYours, file.download)

router.route('/file/:fileId/edit')
  .get(file.exists, file.isYours, file.renderEdit)
  .post(file.exists, file.isYours, file.validateEdit, handleValidationErrors, file.submitEdit)

router.route('/file/:fileId/delete')
  .get(file.exists, file.isYours, file.renderDelete)
  .post(file.exists, file.isYours, file.validateDelete, handleValidationErrors, file.submitDelete)

router.route('/new-file')
  .get(file.renderNew)
  .post(upload.single('upload'), file.validateNew, handleValidationErrors, file.submitNew)

router.route('/new-folder')
  .get(directory.renderNew)
  .post(directory.validate, handleValidationErrors, directory.submitNew)

router.route('/logout')
  .get(asyncHandler(async (req, res, next) => {
    req.logOut((err) => {
      if (err) return next(err)
        req.flash('alert', 'You have been logged out. See you soon!')
      return res.redirect('/login')
    })
  }))

export default router;