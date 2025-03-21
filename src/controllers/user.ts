import asyncHandler from "express-async-handler";
import { body } from "express-validator";

import * as render from "./render";
import { usernameValidation } from "../common/usernameValidation";
import { validate } from "../middleware/validate";
import * as userQueries from "../../prisma/queries/user";

export const edit = [
  usernameValidation,
  body("password")
    .trim()
    .custom(async (value, { req }) => {
      if (value.length > 0 && req.user.githubId) {
        throw new Error(
          "This account was authenticated with GitHub and does not need a password."
        );
      }
      if (value.length > 0 && value.length < 8)
        throw new Error("New password must be 8 or more characters long.");
    })
    .escape(),
  body("confirmPassword")
    .trim()
    .custom(async (value, { req }) => {
      if (req.body.password !== "" && value.length === 0)
        throw new Error("Please confirm your new password.");
    })
    .bail()
    .custom(async (value, { req }) => {
      if (value !== req.body.password)
        throw new Error("Both passwords do not match.");
    })
    .escape(),
  body("currentPassword")
    .trim()
    .custom(async (value, { req }) => {
      if (req.body.password !== "") {
        if (req.body.password !== "" && value.length === 0)
          throw new Error(
            "Please enter your current password in order to change it."
          );
        const match = await userQueries.comparePassword({
          userData: req.user,
          password: value,
        });
        if (!match) throw new Error("Incorrect password.");
      }
    })
    .escape(),
  body("sortFiles")
    .trim()
    .optional({ values: "falsy" })
    .custom((value) => {
      if (
        value !== "" &&
        !["name", "type", "size", "created", "updated"].includes(value)
      )
        throw new Error("Not a valid sort value.");
      return true;
    }),
  body("sortFilesDirection")
    .trim()
    .custom((value) => {
      if (value !== "" && !["asc", "desc"].includes(value))
        throw new Error("Not a valid sort value.");
      return true;
    })
    .optional(),
  body("sortDirs")
    .trim()
    .custom((value) => {
      if (value !== "" && !["name", "created", "updated"].includes(value))
        throw new Error("Not a valid sort value.");
      return true;
    })
    .optional(),
  body("sortDirsDirection")
    .trim()
    .custom((value) => {
      if (value !== "" && !["asc", "desc"].includes(value))
        throw new Error("Not a valid sort value.");
      return true;
    })
    .optional(),
  validate,
  asyncHandler(async (req, res, next) => {
    if (req.formErrors) return render.account(req, res, next);
    await userQueries.update({
      userData: req.thisUser,
      body: req.body,
    });
    req.flash("success", "Your account details have been successfully saved.");
    return res.redirect("/account");
  }),
];

export const delValidate = [
  body("password")
    .trim()
    .custom(async (value, { req }) => {
      if (value && !req.user.password)
        throw new Error(
          "This account was authenticated with GitHub and does not have a password."
        );
    })
    .bail()
    .custom(async (value, { req }) => {
      if (value) {
        const match = await userQueries.comparePassword({
          userData: req.user,
          password: value,
        });
        if (!match) throw new Error("Incorrect password.");
      } else {
        if (req.user.password) throw new Error("Please enter your password.");
      }
    })
    .escape(),
  body("githubUser")
    .trim()
    .custom(async (value, { req }) => {
      if (value && req.user.password)
        throw new Error(
          "This account was created with a password and requires it to perform this action."
        );
    })
    .bail()
    .custom(async (value, { req }) => {
      if (value) {
        if (req.user.githubUser !== value)
          throw new Error("Incorrect GitHub username.");
      } else {
        if (req.user.githubUser)
          throw new Error("Please enter your GitHub username.");
      }
    })
    .escape(),
  validate,
  asyncHandler(async (req, res, next) => {
    if (req.formErrors) return render.deleteAccount(req, res, next);
    return next();
  }),
];

export const delRedirect = asyncHandler(async (req, res, next) => {
  await userQueries.del(req.thisUser.id);
  req.logOut((err) => {
    if (err) return next(err);
    req.flash(
      "success",
      "Your account and its content has been successfully deleted."
    );
    return res.redirect("/signup");
  });
});

export const del = [...delValidate, delRedirect];
