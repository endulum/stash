// everthing to do with interacting with supabase.
// in own module to conditionally import in non-testing env
import asyncHandler from "express-async-handler";
import { body } from "express-validator";
import multer from "multer";
import { Readable } from "stream";

import * as supabase from "../../supabase/supabase";
import * as fileQueries from "../../prisma/queries/file";
import { locationValidation } from "../common/locationValidation";
import { validate } from "../middleware/validate";
import * as file from "./file";
import * as directory from "./directory";
import * as shared from "./shared";
import * as render from "./render";
import { buildZip } from "../functions/buildZip";
import { niceBytes } from "../functions/niceBytes";

const storage = multer.memoryStorage();
const uploadMulter = multer({ storage });

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

const pipeDownloadDir = asyncHandler(async (req, res) => {
  const buffer = await buildZip(req.thisDirectory, req.thisDirectory.authorId);
  const readable = Readable.from(buffer);
  res.set(
    "Content-disposition",
    "attachment; filename=" + `${req.thisDirectory.name}.zip`
  );
  res.set("Content-Type", "application/x-zip-compressed");
  readable.pipe(res);
});

const uploadFileValidation = [
  uploadMulter.single("upload"),
  body("upload").custom(async (_value, { req }) => {
    if (!req.file) throw new Error("Please upload a file.");
    if (req.file.size > 5242880) {
      throw new Error(
        "Files cannot be larger than 5 megabytes (5,242,880 bytes) in size."
      );
    }
    if (req.thisUser.storage + req.file.size > 52428800)
      throw new Error(
        `This file is ${niceBytes(req.file.size)}, but you have ${niceBytes(
          52428800 - req.thisUser.storage
        )} of space left. `
      );
    const duplicate = await fileQueries.findNamedDuplicate(
      req.file.originalname.split(".")[0],
      req.body.location === "home" ? null : req.body.location
    );
    if (duplicate)
      throw new Error(
        "There already exists a file in the chosen location with this name. Files in the same location cannot have the same name. Try changing the name of the file you are uploading, and upload it again."
      );
  }),
  locationValidation,
  validate,
];

export const dropFile = [
  ...uploadFileValidation,
  asyncHandler(async (req, res) => {
    if (req.formErrors) res.status(400).json(req.formErrors);
    else if (!req.file)
      res
        .status(400)
        .send(
          "Sorry, something went wrong when uploading your file. Try again."
        );
    else {
      const id = await supabase.upload(
        req.file,
        req.thisUser.id,
        req.body.location === "home" ? null : req.body.location
      );
      if (!id)
        res
          .status(400)
          .send(
            "Sorry, something went wrong when uploading your file. Try again."
          );
      else res.json({ newFileId: id });
    }
  }),
];

export const uploadFile = [
  ...uploadFileValidation,
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

export const deleteFile = [
  ...file.delValidate,
  asyncHandler(async (req, _res, next) => {
    await supabase.del(req.thisFile.id, req.thisUser.id);
    return next();
  }),
  file.delRedirect,
];

export const deleteDir = [
  ...directory.delValidate,
  asyncHandler(async (req, _res, next) => {
    await supabase.delDir(req.thisDirectory);
    return next();
  }),
  directory.delRedirect,
];

export const serveFile = [file.exists, pipeServe];

export const serveSharedFile = [...shared.fileIsDescendant, pipeServe];

export const downloadFile = [file.exists, pipeDownload];

export const downloadSharedFile = [...shared.fileIsDescendant, pipeDownload];

export const downloadDir = [directory.exists, pipeDownloadDir];

export const downloadSharedDir = [...shared.dirIsDescendant, pipeDownloadDir];

export const downloadSharedRoot = [
  shared.exists,
  asyncHandler(async (req, _res, next) => {
    req.thisDirectory = req.thisSharedDirectory;
    return next();
  }),
  pipeDownloadDir,
];
