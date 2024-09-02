declare global {
  namespace Express {
    export interface Request {
      user?: User,
      prevForm?: Record<string, any>,
      formErrors?: Record<string, string>,
      formMessage?: string
    }
    export interface User {
      id: number,
      username: string,
      password: string,
    }
  }
}

export {}