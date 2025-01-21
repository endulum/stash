import asyncHandler from "express-async-handler";

import { router as authRouter } from "../routes/auth";
import { router as mainRouter } from "../routes/main";
import { findSettings } from "../../prisma/queries/user";

// Express.User is always unioned with undefined,
// which means every middleware that uses req.user needs to have it typechecked.
// this is a little annoying, so if req.user exists, this handler
// reassigns it to req.thisUser whose type is never undefined.

const initUser = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return authRouter(req, res, next);
  } else {
    req.thisUser = req.user;
    req.thisUserSettings = await findSettings(req.user.id);

    // set locals for convenience
    res.locals.user = req.user;
    res.locals.warning = req.flash("warning");
    res.locals.success = req.flash("success");

    return mainRouter(req, res, next);
  }
});

export { initUser };
