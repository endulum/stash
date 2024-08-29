export {}

declare global {
  namespace Express {
    export interface Request {
      user?: User
    }
    export interface User {
      id: number,
      username: string,
      password: string,
    }
  }
}