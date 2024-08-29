import asyncHandler from "express-async-handler";
import { validationResult } from "express-validator";

const handleValidationErrors = asyncHandler(async (req, res, next) => {
  const errorsArray = validationResult(req).array()
  if (errorsArray.length > 0) {
    req.inputErrors = errorsArray.map(error => error.msg)
  }
  next()
})

export default handleValidationErrors