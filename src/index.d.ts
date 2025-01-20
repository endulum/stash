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
      thisDirectory: Prisma.DirectoryGetPayload<{
        include: {
          directories: {
            select: {
              id: true;
              name: true;
            };
          };
          files: true;
        };
      }>;
    }
  }
}

export {};
