import asyncHandler from "express-async-handler";

import { getPathString, findDescendants } from "../../prisma/queries/directory";
import { getPathString as getFilePathString } from "../../prisma/queries/file";

// errors

export const notFound = asyncHandler(async (_req, res) => {
  return res.status(404).render("layout", {
    page: "pages/error",
    title: "Not Found",
    message: "The page you're looking for could not be found.",
  });
});

export const dirNotFound = asyncHandler(async (_req, res) => {
  return res.status(404).render("layout", {
    page: "pages/error",
    title: "Directory Not Found",
    message: "The directory you're looking for could not be found.",
  });
});

export const fileNotFound = asyncHandler(async (_req, res) => {
  return res.status(404).render("layout", {
    page: "pages/error",
    title: "File Not Found",
    message: "The file you're looking for could not be found.",
  });
});

export const sharedDirNotFound = asyncHandler(async (_req, res) => {
  return res.status(404).render("layout", {
    page: "pages/error",
    title: "Shared Directory Not Found",
    message: "The shared directory you're looking for could not be found.",
  });
});

export const rateLimit = asyncHandler(async (_req, res) => {
  return res.status(429).render("layout", {
    page: "pages/error",
    title: "Too Many Requests",
    message: "You're submitting too many requests too fast. Try again later.",
  });
});

export const noGhCode = asyncHandler(async (_req, res) => {
  return res.status(400).render("layout", {
    page: "pages/error",
    title: "Authentication Error",
    message: "No code was provided for GitHub authentication.",
  });
});

// pages

export const index = asyncHandler(async (_req, res) => {
  return res.render("layout", {
    page: "pages/index",
    title: "Home",
  });
});

export const login = asyncHandler(async (req, res) => {
  // specific for the signup post handler, saving the new account's username
  const loginUsernamePrefill = req.flash("loginUsernamePrefill");

  return res.status(req.formErrors ? 400 : 200).render("layout", {
    page: "pages/auth/login",
    title: "Log In",
    prefill: {
      ...req.body,
      username:
        loginUsernamePrefill.length > 0
          ? loginUsernamePrefill
          : req.body.username,
    },
  });
});

export const signup = asyncHandler(async (req, res) => {
  return res.status(req.formErrors ? 400 : 200).render("layout", {
    page: "pages/auth/signup",
    title: "Sign Up",
    prefill: req.body,
  });
});

export const account = asyncHandler(async (req, res) => {
  return res.status(req.formErrors ? 400 : 200).render("layout", {
    page: "pages/account/settings",
    title: "Account Settings",
    prefill: {
      ...req.body,
      username: req.body.username ?? req.user?.username,
    },
  });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  return res.status(req.formErrors ? 400 : 200).render("layout", {
    page: "pages/account/delete",
    title: "Delete Account",
  });
});

// dir

export const dir = asyncHandler(async (_req, res) => {
  return res.render("layout", {
    page: "pages/directory/view",
    title: "Your Files",
  });
});

export const newDir = asyncHandler(async (req, res) => {
  return res.status(req.formErrors ? 400 : 200).render("layout", {
    page: "pages/directory/new",
    title: "Create a Directory",
    locations: [
      { id: null },
      ...(await findDescendants(req.thisUser.id, { id: null })),
    ],
    prefill: {
      ...req.body,
      location: req.body.location ?? req.query.location,
    },
  });
});

export const editDir = asyncHandler(async (req, res) => {
  return res.status(req.formErrors ? 400 : 200).render("layout", {
    page: "pages/directory/edit",
    title: "Edit Directory",
    locations: [
      { id: null },
      ...(await findDescendants(req.thisUser.id, { id: null })),
    ].filter((loc) => loc.id !== req.thisDirectory.id),
    prefill: {
      ...req.body,
      name: req.body.name ?? req.thisDirectory.name,
      location: req.body.location ?? req.thisDirectory.parentId,
      shareUntil:
        "shareUntil" in req.body
          ? req.body.shareUntil
          : req.thisDirectory.shareUntil?.toISOString().substring(0, 10),
    },
  });
});

export const deleteDir = asyncHandler(async (req, res) => {
  return res.status(req.formErrors ? 400 : 200).render("layout", {
    page: "pages/directory/delete",
    title: "Delete Directory",
    path: await getPathString(req.thisDirectory),
  });
});

// file

export const file = asyncHandler(async (_req, res) => {
  return res.render("layout", {
    page: "pages/file/view",
    title: "Viewing File",
  });
});

export const newFile = asyncHandler(async (req, res) => {
  return res.status(req.formErrors ? 400 : 200).render("layout", {
    page: "pages/file/new",
    title: "Upload a File",
    locations: [
      { id: null },
      ...(await findDescendants(req.thisUser.id, { id: null })),
    ],
    prefill: {
      ...req.body,
      location: req.body.location ?? req.query.location,
    },
  });
});

export const editFile = asyncHandler(async (req, res) => {
  res.locals.file = req.thisFile;
  return res.status(req.formErrors ? 400 : 200).render("layout", {
    page: "pages/file/edit",
    title: "Edit File",
    locations: [
      { id: null },
      ...(await findDescendants(req.thisUser.id, { id: null })),
    ],
    prefill: {
      ...req.body,
      name: req.body.name ?? req.thisFile.name,
      location: req.body.location ?? req.thisFile.directoryId,
    },
  });
});

export const deleteFile = asyncHandler(async (req, res) => {
  res.locals.file = req.thisFile;
  return res.status(req.formErrors ? 400 : 200).render("layout", {
    page: "pages/file/delete",
    title: "Delete File",
    path: await getFilePathString(req.thisFile),
  });
});

// shared

export const sharedDir = asyncHandler(async (_req, res) => {
  return res.render("layout", {
    page: "pages/directory/view-shared",
    title: "Viewing Shared Directory",
  });
});

export const sharedFile = asyncHandler(async (_req, res) => {
  return res.render("layout", {
    page: "pages/file/view-shared",
    title: "Viewing Shared File",
  });
});
