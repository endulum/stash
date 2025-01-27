import express from "express";
import asyncHandler from "express-async-handler";

import { logOut } from "../controllers/auth";
import * as render from "../controllers/render";
import * as user from "../controllers/user";
import * as dir from "../controllers/directory";
import * as file from "../controllers/file";
import * as search from "../controllers/search";

const router = express.Router();
const redirectIndex = asyncHandler(async (_req, res) => {
  return res.redirect("/");
});

router.route("/").get(render.index);
router.route("/login").get(redirectIndex);
router.route("/signup").get(redirectIndex);
router.route("/logout").get(logOut);

// account

router.route("/account").get(render.account).post(user.edit);
router.route("/delete").get(render.deleteAccount).post(user.del);

// dir

router.route("/dir/root").get(dir.getRoot);
router.route("/dir/new").get(render.newDir).post(dir.create);
router.route("/dir/:dir").get(dir.get);
router.route("/dir/:dir/edit").get(dir.exists, render.editDir).post(dir.edit);
router
  .route("/dir/:dir/delete")
  .get(dir.exists, render.deleteDir)
  .post(dir.del);

// file

router.route("/file/new").get(render.newFile);
router.route("/file/:file").get(file.get);
router
  .route("/file/:file/edit")
  .get(file.exists, render.editFile)
  .post(file.edit);
router
  .route("/file/:file/delete")
  .get(file.exists, render.deleteFile)
  .post(file.del);

// etc

router.route("/search").get(search.get);

if (process.env.NODE_ENV !== "test") {
  import("../controllers/supa").then((module) => {
    router.route("/dir/:dir/download").get(module.downloadDir);
    router.route("/file/new").post(module.uploadFile);
    router.route("/file/:file/download").get(module.downloadFile);
    router.route("/serve/:file").get(module.serveFile);
    router.route("*").all(render.notFound);
  });
} else {
  router.route("*").all(render.notFound);
}

export { router };
