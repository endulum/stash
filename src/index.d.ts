export {}

declare global {
  namespace Express {
    export interface Request {
      formMessage?: string,
      inputErrors?: string[],
      user?: User | undefined
    }
    export interface User {
      id: number,
      username: string,
      password: string,
      role: string
    }
  }
}