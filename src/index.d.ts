import { type File } from "@prisma/client"

declare global {
  namespace Express {
    export interface Request {
      user?: User,
      prevForm?: Record<string, any>,
      formErrors?: Record<string, string>,
      currentFile: File
    }
    export interface User {
      id: number,
      username: string,
      password: string,
    }
  }
}

export {}