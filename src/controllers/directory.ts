import asyncHandler from "express-async-handler";
import { body } from "express-validator";

import * as render from "./render";
import * as dirQueries from "../../prisma/queries/directory";
import * as fileQueries from "../../prisma/queries/file";
import { validate } from "../middleware/validate";
import { locationValidation } from "../common/locationValidation";
import { niceBytes } from "../functions/niceBytes";

export const exists = asyncHandler(async (req, res, next) => {
  const dir = await dirQueries.findWithAuthor(req.thisUser.id, req.params.dir);
  if (!dir) return render.dirNotFound(req, res, next);
  req.thisDirectory = dir;
  res.locals.dir = dir;
  res.locals.path = await dirQueries.findPath(req.thisDirectory);
  return next();
});

export const getRoot = asyncHandler(async (req, res, next) => {
  res.locals.dir = null;
  res.locals.childDirs = await dirQueries.findChildrenDirs(
    null,
    req.thisUserSettings
  );
  res.locals.childFiles = (
    await fileQueries.findChildrenFiles(null, req.thisUserSettings)
  ).map((f) => ({ ...f, size: niceBytes(f.size) }));
  return render.dir(req, res, next);
});

export const get = [
  exists,
  asyncHandler(async (req, res, next) => {
    res.locals.childDirs = await dirQueries.findChildrenDirs(
      req.thisDirectory.id,
      req.thisUserSettings
    );
    res.locals.childFiles = (
      await fileQueries.findChildrenFiles(
        req.thisDirectory.id,
        req.thisUserSettings
      )
    ).map((f) => ({ ...f, size: niceBytes(f.size) }));
    return render.dir(req, res, next);
  }),
];

const validation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 64 })
    .withMessage("Directory names must be between 2 and 64 characters long.")
    .bail()
    .matches(/^[A-Za-z0-9-_ ]+$/g)
    .withMessage(
      "Directory names must only consist of letters, numbers, hyphens, underscores, and spaces."
    )
    .bail()
    .custom(async (value, { req }) => {
      const duplicate = await dirQueries.findExistingWithName(
        req.thisUser.id,
        req.body.location === "home" ? null : req.body.location,
        value
      );
      if (
        duplicate &&
        !(req.thisDirectory && req.thisDirectory.id === duplicate.id)
      )
        throw new Error(
          "There already exists a directory in the chosen location with this name. Directories in the same location cannot have the same name."
        );
    })
    .escape(),
  locationValidation,
];

export const create = [
  ...validation,
  validate,
  asyncHandler(async (req, res, next) => {
    if (req.formErrors) return render.newDir(req, res, next);
    const id = await dirQueries.create({
      authorId: req.thisUser.id,
      parentId: req.body.location === "home" ? null : req.body.location,
      name: req.body.name,
    });
    req.flash("success", "New directory successfully created.");
    res.redirect(`/dir/${id}`);
  }),
];

export const edit = [
  exists,
  ...validation,
  body("shareUntil").trim().optional({ values: "falsy" }).isDate(),
  validate,
  asyncHandler(async (req, res, next) => {
    if (req.formErrors) return render.editDir(req, res, next);
    await dirQueries.edit(req.thisDirectory.id, req.body);
    req.flash("success", "Your directory has been successfully edited.");
    res.redirect(`/dir/${req.thisDirectory.id}`);
  }),
];

export const del = [
  exists,
  body("path")
    .trim()
    .custom(async (value, { req }) => {
      const path = await dirQueries.getPathString(req.thisDirectory);
      if (value !== path) throw new Error("Incorrect path.");
    })
    .escape(),
  validate,
  asyncHandler(async (req, res, next) => {
    if (req.formErrors) return render.deleteDir(req, res, next);
    await dirQueries.del(req.thisDirectory.id);
    req.flash("success", "Directory successfully deleted.");
    res.redirect(
      req.thisDirectory.parentId
        ? `/dir/${req.thisDirectory.parentId}`
        : "/dir/root"
    );
  }),
];
