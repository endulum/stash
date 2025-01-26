import { Prisma } from "@prisma/client";

declare global {
  namespace Express {
    export interface User {
      id: number;
      username: string;
      password: string;
      githubUser: string | null;
      githubId: number | null;
      role: Prisma.Role;
      settings: Prisma.UserSettings;
    }

    export interface Request {
      formErrors?: Record<string, string>;
      thisUser: Prisma.UserGetPayload<{ include: { settings: true } }>;
      thisDirectory: Prisma.DirectoryGetPayload<{
        include: {
          directories: true;
          files: true;
        };
      }>;
      thisSharedDirectory: Prisma.DirectoryGetPayload<{
        include: {
          directories: true;
          files: true;
          author: {
            select: { id: true; username: true };
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
