import type { Request } from "express"
import asyncHandler from "express-async-handler"
import { validationResult } from "express-validator"

interface reqWithErrors extends Request {
  formErrors?: Record<string, string>
}

const handleValidationErrors = asyncHandler(async (req: reqWithErrors, res, next) => {
  const errorsArray = validationResult(req).array()
  if (errorsArray.length > 0) {
    req.formErrors = {}
    errorsArray.forEach(error => {
      if (req.formErrors && error.type === 'field') 
        req.formErrors[error.path] = error.msg
    })
  }
  return next()
})

export default handleValidationErrors