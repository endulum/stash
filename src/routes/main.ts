import express from "express";
import asyncHandler from "express-async-handler";

import { logOut } from "../controllers/auth";
import * as render from "../controllers/render";
import * as user from "../controllers/user";
import * as dir from "../controllers/directory";
import * as file from "../controllers/file";
import * as search from "../controllers/search";

const router = express.Router();
const redirectRoot = asyncHandler(async (_req, res) => {
  return res.redirect("/dir/root");
});

router.route("/").get(redirectRoot);
router.route("/login").get(redirectRoot);
router.route("/signup").get(redirectRoot);
router.route("/logout").get(logOut);

// account

router.route("/account").get(render.account).post(user.edit);
router.route("/delete").get(render.deleteAccount);

// dir

router.route("/dir/root").get(dir.getRoot);
router.route("/dir/new").get(render.newDir).post(dir.create);
router.route("/dir/:dir").get(dir.get);
router.route("/dir/:dir/edit").get(dir.exists, render.editDir).post(dir.edit);
router.route("/dir/:dir/delete").get(dir.exists, render.deleteDir);

// file

router.route("/file/new").get(render.newFile);
router.route("/file/:file").get(file.get);
router
  .route("/file/:file/edit")
  .get(file.exists, render.editFile)
  .post(file.edit);
router.route("/file/:file/delete").get(file.exists, render.deleteFile);

// etc

router.route("/search").get(search.get);

if (process.env.NODE_ENV !== "test") {
  import("../controllers/supa").then((module) => {
    router.post("/dir/:dir/delete", module.deleteDir);
    router.post("/file/:file/delete", module.deleteFile);
    router.post("/delete", module.deleteAccount);
    router.route("/dir/:dir/download").get(module.downloadDir);
    router.route("/file/new").post(module.uploadFile);
    router.route("/file/drop").post(module.dropFile);
    router.route("/file/:file/download").get(module.downloadFile);
    router.route("/serve/:file").get(module.serveFile);
    router.route("*").all(render.notFound);
  });
} else {
  router.post("/delete", user.del);
  router.post("/dir/:dir/delete", dir.del);
  router.post("/file/:file/delete", file.del);
  router.route("*").all(render.notFound);
}

export { router };
