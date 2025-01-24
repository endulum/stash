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
      thisUserSettings: Prisma.UserSettings;
      thisDirectory: Prisma.Directory;
      thisSharedDirectory: Prisma.DirectoryGetPayload<{
        include: {
          author: {
            include: {
              settings: true;
            };
          };
        };
      }>;
      thisFile: Prisma.FileGetPayload<{
        include: { directory: true };
      }>;
    }
  }
}

export {};
