import asyncHandler from "express-async-handler";

import * as render from "./render";
import * as dirQueries from "../../prisma/queries/directory";
import * as fileQueries from "../../prisma/queries/file";
import { niceBytes } from "../functions/niceBytes";

export const exists = asyncHandler(async (req, res, next) => {
  const dir = await dirQueries.findShared(
    req.params.sharedDir,
    req.thisUser ? req.thisUser.settings : null
  );
  if (!dir) return render.sharedDirNotFound(req, res, next);
  req.thisSharedDirectory = dir;
  res.locals.sharedDir = dir;
  return next();
});

export const get = [
  exists,
  asyncHandler(async (req, res, next) => {
    res.locals.dir = null;
    res.locals.childDirs = req.thisSharedDirectory.directories;
    res.locals.childFiles = req.thisSharedDirectory.files.map((f) => ({
      ...f,
      size: niceBytes(f.size),
    }));
    return render.sharedDir(req, res, next);
  }),
];

export const dirIsDescendant = [
  exists,
  asyncHandler(async (req, res, next) => {
    const dir = await dirQueries.find(req.params.dir);
    if (!dir) return render.dirNotFound(req, res, next);
    if (dir.id === req.thisSharedDirectory.id)
      return res.redirect(`/shared/${dir.id}`);

    const path = await dirQueries.trimPath(dir, req.thisSharedDirectory.id);
    if (path.length === 0) return render.dirNotFound(req, res, next);

    req.thisDirectory = dir;
    res.locals.dir = dir;
    res.locals.path = path;
    return next();
  }),
];

export const getDescendantDir = [
  ...dirIsDescendant,
  asyncHandler(async (req, res, next) => {
    res.locals.childDirs = req.thisDirectory.directories;
    res.locals.childFiles = req.thisDirectory.files.map((f) => ({
      ...f,
      size: niceBytes(f.size),
    }));
    return render.sharedDir(req, res, next);
  }),
];

export const fileIsDescendant = [
  exists,
  asyncHandler(async (req, res, next) => {
    const file = await fileQueries.find(req.params.file);
    if (!file) return render.fileNotFound(req, res, next);

    const path = await fileQueries.trimPath(file, req.thisSharedDirectory.id);
    if (path.length === 0) return render.fileNotFound(req, res, next);
    req.thisFile = file;
    res.locals.file = {
      ...file,
      size: niceBytes(file.size),
    };
    res.locals.path = [
      ...path,
      { name: req.thisFile.name + "." + req.thisFile.ext },
    ];
    return next();
  }),
];

export const getDescendantFile = [
  ...fileIsDescendant,
  asyncHandler(async (req, res, next) => {
    return render.sharedFile(req, res, next);
  }),
];
