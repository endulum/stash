import { Prisma, type File, type Directory } from "@prisma/client";

declare global {
  namespace Express {
    // type CurrentDirectory = Prisma.DirectoryGetPayload<{
    //   include: { parent: true; directories: true; files: true };
    // }>;

    // type SharedDirectory = Prisma.DirectoryGetPayload<{
    //   include: { directories: true; files: true };
    // }>;

    // export interface Request {
    //   user?: User;
    //   prevForm?: Record<string, string>;
    //   formErrors?: Record<string, string>;
    //   currentFile: File;
    //   currentDirectory: CurrentDirectory;
    //   sharedDirectory: SharedDirectory;
    //   pathToSharedRoot: Array<{ name: string; id: string | null }>;
    //   fileDataString: string;
    // }
    export interface User {
      id: number;
      username: string;
      password: string;
    }

    export interface Request {
      user?: User;
      formErrors?: Record<string, string>;
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
      // //
      // currentDirChildren: Directory[];
      // currentDirFiles: File[]
    }
  }
}

export {};
