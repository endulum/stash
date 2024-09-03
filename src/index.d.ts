import { Prisma, type File, type Folder } from "@prisma/client"

declare global {
  namespace Express {
    type ExtendedFolder = Prisma.FolderGetPayload<{
      include: { parent: true, children: true, files: true }
    }>

    export interface Request {
      user?: User,
      prevForm?: Record<string, any>,
      formErrors?: Record<string, string>,
      currentFile: File,
      currentFolder: ExtendedFolder
    }
    export interface User {
      id: number,
      username: string,
      password: string,
    }
  }
}

export {}