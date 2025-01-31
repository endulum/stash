import express from "express";
import * as shared from "../controllers/shared";

const router = express.Router();

router.route("/:sharedDir").get(shared.get);
router.route("/:sharedDir/dir/:dir").get(shared.getDescendantDir);
router.route("/:sharedDir/file/:file").get(shared.getDescendantFile);

if (process.env.NODE_ENV !== "test") {
  import("../controllers/supa").then((module) => {
    router.route("/:sharedDir/serve/:file").get(module.serveSharedFile);
    router
      .route("/:sharedDir/file/:file/download")
      .get(module.downloadSharedFile);
    router.route("/:sharedDir/download").get(module.downloadSharedRoot);
    router.route("/:sharedDir/dir/:dir/download").get(module.downloadSharedDir);
  });
}

export { router };
