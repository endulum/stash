import express from 'express';
import asyncHandler from 'express-async-handler';
import directory from '../controllers/directory';
import file from '../controllers/file'

const shareRouter = express.Router()

shareRouter.route('/share/:sharedDirectoryId')
  .get(directory.isShared, directory.view)

shareRouter.route('/share/:sharedDirectoryId/directory/:directoryId')
  .get(directory.isShared, directory.exists, directory.view)

export default shareRouter