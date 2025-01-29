import { rateLimit } from "express-rate-limit";

import { rateLimit as renderRateLimit } from "../controllers/render";

export const limiter = [
  ...(process.env.NODE_ENV !== "test"
    ? [
        rateLimit({
          windowMs: 1 * 60 * 1000,
          limit: 5,
          // 5 submissions allowed every minute
          standardHeaders: true,
          legacyHeaders: false,
          message: renderRateLimit,
        }),
      ]
    : []),
];
