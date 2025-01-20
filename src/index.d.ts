import { Prisma } from "@prisma/client";

declare global {
  namespace Express {
    export interface User {
      id: number;
      username: string;
      password: string;
    }

    export interface Request {
      formErrors?: Record<string, string>;
      thisUser: Prisma.User;
      thisDirectory: Prisma.Directory;
    }
  }
}

export {};
