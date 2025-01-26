import asyncHandler from "express-async-handler";

import { router as authRouter } from "../routes/auth";
import { router as mainRouter } from "../routes/main";

// Express.User is always unioned with undefined,
// which means every middleware that uses req.user needs to have it typechecked.
// this is a little annoying, so if req.user exists, this handler
// reassigns it to req.thisUser whose type is never undefined.

const initUser = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return authRouter(req, res, next);
  } else {
    req.thisUser = req.user;
    res.locals.user = req.user;
    return mainRouter(req, res, next);
  }
});

export { initUser };
