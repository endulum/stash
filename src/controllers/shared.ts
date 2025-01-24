import asyncHandler from "express-async-handler";

import * as render from "./render";
import * as dirQueries from "../../prisma/queries/directory";
import * as fileQueries from "../../prisma/queries/file";
import { niceBytes } from "../functions/niceBytes";

const exists = asyncHandler(async (req, res, next) => {
  const dir = await dirQueries.findShared(req.params.sharedDir);
  if (!dir) return render.sharedDirNotFound(req, res, next);
  req.thisSharedDirectory = dir;
  res.locals.sharedDir = dir;
  return next();
});

const isDescendant = asyncHandler(async (req, res, next) => {
  const dir = await dirQueries.find(req.params.dir);
  if (!dir) return render.dirNotFound(req, res, next);
  if (dir.id === req.thisSharedDirectory.id)
    return res.redirect(`/shared/${dir.id}`);

  const path = await dirQueries.findPath(dir);
  while (path.length > 0) {
    const p = path.shift();
    if (!p || p.id === req.thisSharedDirectory.id) break;
  }
  if (path.length === 0) return render.dirNotFound(req, res, next);

  req.thisDirectory = dir;
  res.locals.dir = dir;
  res.locals.path = path;
  return next();
});

const isDescendantFile = asyncHandler(async (req, res, next) => {
  const file = await fileQueries.find(req.params.file);
  if (!file) return render.fileNotFound(req, res, next);

  const path = await dirQueries.findPath(file.directory);
  while (path.length > 0) {
    const p = path.shift();
    if (!p || p.id === req.thisSharedDirectory.id) break;
  }
  if (path.length === 0) return render.dirNotFound(req, res, next);

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
});

export const getSharedRoot = [
  exists,
  asyncHandler(async (req, res, next) => {
    res.locals.dir = null;
    res.locals.childDirs = await dirQueries.findChildrenDirs(
      req.thisSharedDirectory.id,
      req.thisSharedDirectory.author.settings!
    );
    res.locals.childFiles = (
      await fileQueries.findChildrenFiles(
        req.thisSharedDirectory.id,
        req.thisSharedDirectory.author.settings!
      )
    ).map((f) => ({ ...f, size: niceBytes(f.size) }));
    return render.sharedDir(req, res, next);
  }),
];

export const getSharedDescendant = [
  exists,
  isDescendant,
  asyncHandler(async (req, res, next) => {
    res.locals.childDirs = await dirQueries.findChildrenDirs(
      req.thisDirectory.id,
      req.thisSharedDirectory.author.settings!
    );
    res.locals.childFiles = (
      await fileQueries.findChildrenFiles(
        req.thisDirectory.id,
        req.thisSharedDirectory.author.settings!
      )
    ).map((f) => ({ ...f, size: niceBytes(f.size) }));
    return render.sharedDir(req, res, next);
  }),
];

export const getSharedFile = [
  exists,
  isDescendantFile,
  asyncHandler(async (req, res, next) => {
    return render.sharedFile(req, res, next);
  }),
];
