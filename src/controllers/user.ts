import asyncHandler from "express-async-handler";
import { body } from "express-validator";

import * as render from "./render";
import { usernameValidation } from "../common/usernameValidation";
import { validate } from "../middleware/validate";
import { comparePassword, update } from "../../prisma/queries/user";

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
        const match = await comparePassword({
          userData: req.user,
          password: value,
        });
        if (!match) throw new Error("Incorrect password.");
      }
    })
    .escape(),
  validate,
  asyncHandler(async (req, res, next) => {
    if (!req.user) return render.login(true)(req, res, next);
    if (req.formErrors) return render.account(req, res, next);
    await update({
      userData: req.user,
      body: req.body,
    });
    req.flash("success", "Your account details have been successfully saved.");
    return res.redirect("/account");
  }),
];
