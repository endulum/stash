import express from "express";
import * as shared from "../controllers/shared";

const router = express.Router();

router.route("/:sharedDir").get(shared.getSharedRoot);
router.route("/:sharedDir/dir/:dir").get(shared.getSharedDescendant);
router.route("/:sharedDir/file/:file").get(shared.getSharedFile);
//

if (process.env.NODE_ENV !== "test") {
  import("../controllers/supa").then((module) => {
    router.route("/:sharedDir/serve/:file").get(module.serveShared);
    router.route("/:sharedDir/file/:file/download").get(module.downloadShared);
  });
}

export { router };

/* import express from 'express';
import { controller as directory } from '../controllers/directory';
import { controller as file } from '../controllers/file';

const router = express.Router()

// SHARED DIRECTORIES

router.route('/:sharedDirectoryId')
  .get(directory.isShared, directory.renderReadShared)

router.route('/:sharedDirectoryId/download')
  .get(directory.isShared, directory.download)

router.route('/:sharedDirectoryId/directory/:directoryId')
  .get(directory.isShared, directory.exists, directory.hasSharedRoot, directory.renderReadShared)  

router.route('/:sharedDirectoryId/directory/:directoryId/download')
  .get(directory.isShared, directory.exists, directory.hasSharedRoot, directory.download)

// FILES IN SHARED DIRECTORIES

router.route('/:sharedDirectoryId/file/:fileId')
  .get(directory.isShared, file.exists, file.hasSharedRoot, file.getFileDataString, file.renderReadShared)

router.route('/:sharedDirectoryId/file/:fileId/download')
  .get(directory.isShared, file.exists, file.hasSharedRoot, file.download)

export default router */
