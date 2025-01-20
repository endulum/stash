import asyncHandler from "express-async-handler";
import { body } from "express-validator";
import passport from "passport";
import { rateLimit } from "express-rate-limit";

import { usernameValidation } from "../common/usernameValidation";
import { validate } from "../middleware/validate";
import * as userQueries from "../../prisma/queries/user";
import * as render from "./render";

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  // 5 submissions allowed every 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: render.rateLimit,
});

export const logIn = [
  ...(process.env.NODE_ENV !== "test" ? [limiter] : []),
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Please enter a username.")
    .escape(),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("Please enter a password.")
    .escape(),
  validate,
  asyncHandler(async (req, res, next) => {
    if (req.formErrors) return render.login(req, res, next);
    passport.authenticate("local", (err: Error, user: Express.User) => {
      if (err) return next(err);
      if (!user) {
        req.formErrors = { password: "Incorrect username or password." };
        res.locals.formErrors = req.formErrors;
        return render.login(req, res, next);
      } else
        req.logIn(user, (err) => {
          if (err) return next(err);
          return res.redirect("/");
        });
    })(req, res, next);
  }),
];

export const logOut = asyncHandler(async (req, res, next) => {
  req.logOut((err) => {
    if (err) return next(err);
    req.flash("success", "You have been logged out.");
    return res.redirect("/login");
  });
});

export const signUp = [
  ...(process.env.NODE_ENV !== "test" ? [limiter] : []),
  usernameValidation,
  body("password")
    .trim()
    .notEmpty()
    .withMessage("Please enter a password.")
    .bail()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .escape(),

  body("confirmPassword")
    .trim()
    .notEmpty()
    .withMessage("Please confirm your password.")
    .bail()
    .custom(async (value, { req }) => {
      if (value !== req.body.password)
        throw new Error("Both passwords do not match.");
    })
    .escape(),
  validate,
  asyncHandler(async (req, res, next) => {
    if (req.formErrors) return render.signup(req, res, next);
    await userQueries.create({
      username: req.body.username,
      password: req.body.password,
    });
    req.flash(
      "success",
      "Your account has been created. Please proceed to log in to your new account."
    );
    req.flash("loginUsernamePrefill", req.body.username);
    return res.redirect("/login");
  }),
];

export const github = asyncHandler(async (req, res, next) => {
  const { code } = req.query as Record<string, string | null>;
  if (!code || code === "undefined") {
    return render.noGhCode(req, res, next);
  }
  passport.authenticate("github", (err: Error, user: Express.User) => {
    if (err) return next(err);
    req.logIn(user, (err) => {
      if (err) return next(err);
      req.flash("success", "You have successfully authenticated with GitHub.");
      return res.redirect("/");
    });
  })(req, res, next);
});
