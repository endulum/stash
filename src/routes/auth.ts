import express from "express";
import asyncHandler from "express-async-handler";

import * as auth from "../controllers/auth";
import * as render from "../controllers/render";

const router = express.Router();

router
  .route("/")
  .get(asyncHandler(async (_req, res) => res.redirect("/login")));

router.route("/signup").get(render.signup).post(auth.signUp);
router.route("/login").get(render.login).post(auth.logIn);
router.route("/github").get(auth.github);

router.route("*").all(
  asyncHandler(async (req, res) => {
    req.flash("warning", "You must be logged in to access this page.");
    res.redirect("/login");
  })
);

export { router };
