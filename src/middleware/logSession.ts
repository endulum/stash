import asyncHandler = require("express-async-handler");

const logSession = asyncHandler(async (req, res, next) => {
  console.log(req.session || '(no session)');
  console.log(req.user || '(no user)');
  return next();
})

export default logSession;