import express from "express";
import asyncHandler from "express-async-handler";

import { logOut } from "../controllers/auth";
import * as render from "../controllers/render";
import * as user from "../controllers/user";
import * as dir from "../controllers/directory";

const router = express.Router();
const redirectIndex = asyncHandler(async (_req, res) => {
  return res.redirect("/");
});

router.route("/").get(render.index);
router.route("/account").get(render.account).post(user.auth, user.edit);
router.route("/delete").get(render.deleteAccount).post(user.auth, user.del);

router.route("/root").get(user.auth, dir.root);
router.route("/dir/:dir").get(user.auth, dir.get);

router.route("/login").get(redirectIndex);
router.route("/signup").get(redirectIndex);
router.route("/logout").get(logOut);
router.route("*").all(render.notFound);

export { router };

/* 
import multer from "multer";

import handleValidationErrors from "../middleware/handleValidationErrors";
import {
  controller as account,
  validation as accountValidation,
} from "../controllers/account";
import {
  controller as search,
  validation as searchValidation,
} from "../controllers/search";
import {
  controller as directory,
  validation as directoryValidation,
} from "../controllers/directory";
import {
  controller as file,
  validation as fileValidation,
} from "../controllers/file";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


router
  .route(["/", "/login", "/signup"])
  .get(asyncHandler(async (req, res) => res.redirect("/directory")));

// USER SETTINGS

router
  .route("/account")
  .get(account.renderUpdate)
  .post(
    accountValidation.forUpdate,
    handleValidationErrors,
    account.submitUpdate
  );

router
  .route("/delete")
  .get(account.renderDelete)
  .post(
    accountValidation.forDelete,
    handleValidationErrors,
    account.submitDelete
  );

// FILE SEARCH

router.route("/search").get(searchValidation, search.renderSearch);

// DIRECTORY CRUD

router
  .route("/directory/new")
  .get(directory.renderCreate)
  .post(
    directoryValidation.forCreateOrUpdate,
    handleValidationErrors,
    directory.submitCreate
  );

router.route("/directory/download").get(directory.download);

router.route("/directory").get(directory.renderRead);

router
  .route("/directory/:directoryId")
  .get(directory.exists, directory.isYours, directory.renderRead);

router
  .route("/directory/:directoryId/download")
  .get(directory.exists, directory.isYours, directory.download);

router
  .route("/directory/:directoryId/edit")
  .get(directory.exists, directory.isYours, directory.renderUpdate)
  .post(
    directory.exists,
    directory.isYours,
    directoryValidation.forCreateOrUpdate,
    handleValidationErrors,
    directory.submitUpdate
  );

router
  .route("/directory/:directoryId/delete")
  .get(directory.exists, directory.isYours, directory.renderDelete)
  .post(
    directory.exists,
    directory.isYours,
    directoryValidation.forDelete,
    handleValidationErrors,
    directory.submitDelete
  );

// FILE CRUD

router
  .route("/file/new")
  .get(file.renderCreate)
  .post(
    upload.single("upload"),
    fileValidation.forCreate,
    handleValidationErrors,
    file.submitCreate
  );

router
  .route("/file/:fileId")
  .get(file.exists, file.isYours, file.getFileDataString, file.renderRead);

router
  .route("/file/:fileId/download")
  .get(file.exists, file.isYours, file.download);

router
  .route("/file/:fileId/edit")
  .get(file.exists, file.isYours, file.renderUpdate)
  .post(
    file.exists,
    file.isYours,
    fileValidation.forUpdate,
    handleValidationErrors,
    file.submitUpdate
  );

router
  .route("/file/:fileId/delete")
  .get(file.exists, file.isYours, file.renderDelete)
  .post(
    file.exists,
    file.isYours,
    fileValidation.forDelete,
    handleValidationErrors,
    file.submitDelete
  );

router.route("/logout").get(asyncHandler(async (req, res, next) => {}));

export default router;
 */
