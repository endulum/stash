import { type Request, type Response, type NextFunction } from "express";

const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(err);
  const status =
    "status" in err && typeof err.status === "number" ? err.status : 500;
  res.status(status).render("layout", {
    page: "pages/error",
    title: "Error",
    message: "Sorry, something went wrong when handling your request.",
  });
};

export { errorHandler };
