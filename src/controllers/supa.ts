import asyncHandler from "express-async-handler";
import { body } from "express-validator";
import multer from "multer";

import * as render from "./render";
import * as fileQueries from "../../prisma/queries/file";
import { locationValidation } from "../common/locationValidation";
import { validate } from "../middleware/validate";
import * as supabase from "../../supabase/supabase";
import { exists as fileExists } from "./file";
import { exists as sharedDirExists, isDescendantFile } from "./shared";

const storage = multer.memoryStorage();
const uploadMulter = multer({ storage });

export const upload = [
  uploadMulter.single("upload"),
  body("upload").custom(async (_value, { req }) => {
    if (!req.file) throw new Error("Please upload a file.");
    if (req.file.size > 5242880) {
      throw new Error(
        "Files cannot be larger than 5 megabytes (5,242,880 bytes) in size."
      );
    }
    const duplicate = await fileQueries.findExistingWithName(
      req.thisUser.id,
      req.body.location === "home" ? null : req.body.location,
      req.file.originalname.split(".")[0]
    );
    if (duplicate)
      throw new Error(
        "There already exists a file in the chosen location with this name. Files in the same location cannot have the same name. Try changing the name of the file you are uploading, and upload it again."
      );
  }),
  locationValidation,
  validate,
  asyncHandler(async (req, res, next) => {
    if (!req.file) {
      req.flash(
        "warning",
        "Sorry, something went wrong when uploading your file. Try again."
      );
      return render.newFile(req, res, next);
    }
    if (req.formErrors) return render.newFile(req, res, next);

    const id = await supabase.upload(
      req.file,
      req.thisUser.id,
      req.body.location === "home" ? null : req.body.location
    );

    if (!id) {
      req.flash(
        "warning",
        "Sorry, something went wrong when uploading your file. Try again."
      );
      return render.newFile(req, res, next);
    } else {
      req.flash("success", "File successfully uploaded.");
      return res.redirect(`/file/${id}`);
    }
  }),
];

const pipeServe = asyncHandler(async (req, res) => {
  const { readable, contentType } = await supabase.getReadable(
    req.thisFile.id,
    req.thisFile.authorId
  );
  res.set("Content-Type", contentType ?? "application/x-www-form-urlencoded");
  readable.pipe(res);
});

const pipeDownload = asyncHandler(async (req, res) => {
  const { readable, contentType } = await supabase.getReadable(
    req.thisFile.id,
    req.thisFile.authorId
  );
  res.set(
    "Content-Disposition",
    `attachment; filename="${req.thisFile.name}.${req.thisFile.ext}"`
  );
  res.set("Content-Type", contentType ?? "application/octet-stream");
  readable.pipe(res);
});

export const serve = [fileExists, pipeServe];
export const serveShared = [sharedDirExists, isDescendantFile, pipeServe];

export const download = [fileExists, pipeDownload];
export const downloadShared = [sharedDirExists, isDescendantFile, pipeDownload];
export const downloadDir = [];
export const downloadSharedDir = [];
