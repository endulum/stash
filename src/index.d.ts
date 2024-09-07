import { Prisma, type File, type Folder } from "@prisma/client"

declare global {
  namespace Express {
    type CurrentFolder = Prisma.FolderGetPayload<{
      include: { parent: true, children: true, files: true }
    }>

    type SharedFolder = Prisma.FolderGetPayload<{
      include: { children: true, files: true }
    }>

    export interface Request {
      user?: User,
      prevForm?: Record<string, any>,
      formErrors?: Record<string, string>,
      currentFile: File,
      currentFolder: CurrentFolder,
      sharedFolder: SharedFolder
    }
    export interface User {
      id: number,
      username: string,
      password: string,
    }
  }
}

export {}