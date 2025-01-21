import { body } from "express-validator";

import * as dirQueries from "../../prisma/queries/directory";

const locationValidation = body("location")
  // remember: location = parentId
  .trim()
  .notEmpty()
  .withMessage("Please choose a location.")
  .bail()
  .custom(async (value, { req }) => {
    if (value !== "home") {
      // case: the parent doesn't exist
      const parent = await dirQueries.find(req.thisUser.id, value);
      if (!parent) throw new Error("Selected location could not be found.");
      // case (for editing directory): the parent is itself
      if (req.thisDirectory && value === req.thisDirectory.id)
        throw new Error("A directory cannot be a parent of itself.");
    }
  })
  .escape();

export { locationValidation };
