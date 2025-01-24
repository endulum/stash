import asyncHandler from "express-async-handler";
import { body } from "express-validator";

import * as render from "./render";
import * as dirQueries from "../../prisma/queries/directory";
import * as fileQueries from "../../prisma/queries/file";
import { niceBytes } from "../functions/niceBytes";
import { locationValidation } from "../common/locationValidation";
import { validate } from "../middleware/validate";

export const exists = asyncHandler(async (req, res, next) => {
  const file = await fileQueries.findWithAuthor(
    req.thisUser.id,
    req.params.file
  );
  if (!file) return render.fileNotFound(req, res, next);
  req.thisFile = file;
  res.locals.file = {
    ...req.thisFile,
    size: niceBytes(req.thisFile.size),
  };
  res.locals.path = [
    ...(req.thisFile.directory
      ? await dirQueries.findPath(req.thisFile.directory)
      : []),
    { name: req.thisFile.name + "." + req.thisFile.ext },
  ];
  return next();
});

export const get = [
  exists,
  asyncHandler(async (req, res, next) => {
    return render.file(req, res, next);
  }),
];

export const edit = [
  exists,
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Please enter a name for this file.")
    .bail()
    .isLength({ max: 32 })
    .withMessage("File names cannot be longer than 64 characters.")
    .matches(/^[A-Za-z0-9-._ ]+$/g)
    .withMessage(
      "File names must only consist of letters, numbers, hyphens, underscores, dots, and spaces."
    )
    .custom(async (value, { req }) => {
      const duplicate = await fileQueries.findExistingWithName(
        req.thisUser.id,
        req.thisFile.directoryId,
        value
      );
      if (duplicate && duplicate.id !== req.thisFile.id)
        throw new Error(
          "There already exists a file in the chosen location with this name. Files in the same location cannot have the same name."
        );
    })
    .escape(),
  locationValidation,
  validate,
  asyncHandler(async (req, res, next) => {
    if (req.formErrors) return render.editFile(req, res, next);
    await fileQueries.edit(req.thisFile.id, req.body);
    req.flash("success", "Your file has been successfully edited.");
    return res.redirect(`/file/${req.thisFile.id}`);
  }),
];

export const del = [
  exists,
  body("path")
    .trim()
    .custom(async (value, { req }) => {
      const path = await fileQueries.getPathString(req.thisFile);
      if (value !== path) throw new Error("Incorrect path.");
    })
    .escape(),
  validate,
  asyncHandler(async (req, res, next) => {
    if (req.formErrors) return render.deleteFile(req, res, next);
    await fileQueries.del(req.thisFile.id);
    req.flash("success", "File successfully deleted.");
    res.redirect(
      req.thisFile.directoryId
        ? `/dir/${req.thisFile.directoryId}`
        : "/dir/root"
    );
  }),
];
