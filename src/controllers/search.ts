import asyncHandler from "express-async-handler";
import { query } from "express-validator";

import * as render from "./render";
import * as fileQueries from "../../prisma/queries/file";
import { validate } from "../middleware/validate";

export const get = [
  query("name").trim().escape(),
  query("type")
    .trim()
    .optional({ values: "falsy" })
    .custom(async (value, { req }) => {
      const uniqueTypes = [
        ...(await fileQueries.getUniqueTypes(req.thisUser.id)),
        "any",
        "shared directory",
        "directory",
      ];
      if (!uniqueTypes.includes(value)) throw new Error("Not a valid type.");
    }),
  validate,
  asyncHandler(async (req, res, next) => {
    res.locals.uniqueTypes = await fileQueries.getUniqueTypes(req.thisUser.id);
    const results = await fileQueries.search(
      req.thisUser.id,
      req.query as Record<string, string>
    );
    res.locals.results = results;
    return render.search(req, res, next);
  }),
];
