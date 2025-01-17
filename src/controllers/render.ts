import asyncHandler from "express-async-handler";

// errors

export const notFound = asyncHandler(async (_req, res) => {
  return res.status(404).render("layout", {
    page: "pages/error",
    title: "Not Found",
    message: "The page you're looking for could not be found.",
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
  // provided by the signup post handler, saving the new account's username
  const loginUsernamePrefill = req.flash("loginUsernamePrefill");
  return res.status(req.formErrors ? 400 : 200).render("layout", {
    page: "pages/login",
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
    page: "pages/signup",
    title: "Sign Up",
    prefill: req.body,
  });
});
