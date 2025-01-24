import asyncHandler from "express-async-handler";

const initLocals = asyncHandler(async (req, res, next) => {
  res.locals.user = req.user;
  res.locals.warning = req.flash("warning");
  res.locals.success = req.flash("success");
  return next();
});

export { initLocals };
