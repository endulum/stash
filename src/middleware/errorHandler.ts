import { type Request, type Response, type NextFunction } from "express"

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AggregateError) {
    console.error(err['errors'])
  } else console.error(err)

  // currently don't know of a way to handle session store connection error
  // so this will have to do.
  if (err instanceof AggregateError && err['errors'][0].code === 'ECONNREFUSED') {
    return res.render('sample/error', {
      code: 500,
      message: 'The database cannot be accessed at this time.'
    })
  }

  return res.render('sample/error', {
    code: 'statusCode' in err ? err.statusCode : 500,
    message: err.message || 'Something went wrong when handling your request.'
  })
};

export default errorHandler;