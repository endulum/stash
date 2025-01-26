import asyncHandler from "express-async-handler";
import { validationResult } from "express-validator";

export const validate = asyncHandler(async (req, res, next) => {
  const errorsArray = validationResult(req).array();
  if (errorsArray.length > 0) {
    // build errors array keeping only relevant properties: value, path, msg
    const errors = errorsArray.reduce(
      (acc: { value: string; path: string; msg: string }[], curr) => {
        if (curr.type === "field") {
          acc.push({ value: curr.value, path: curr.path, msg: curr.msg });
        }
        return acc;
      },
      []
    );

    // log
    if (process.env.NODE_ENV === "development") console.warn(errors);

    // set custom header to errors array, to easily check with supertest
    res.set("X-Validation-Errors", JSON.stringify(errors));

    // set formErrors using errors aray
    req.formErrors = {};
    errors.forEach((error) => {
      if (req.formErrors) req.formErrors[error.path] = error.msg;
    });
    res.locals.formErrors = req.formErrors;
  } else {
    res.locals.formErrors = null;
  }
  return next();
});
