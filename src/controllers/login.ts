import { type RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { ValidationChain, body } from "express-validator";
import passport from "passport";

const login: {
  render: RequestHandler,
  validate: ValidationChain[],
  submit: RequestHandler
} = {
  render: asyncHandler(async (req, res, next) => {
    return res.render('layout', {
      page: 'pages/login',
      title: 'Log In',
      prevForm: req.body,
      formErrors: req.formErrors,
      formMessage: req.formMessage
    })
  }),

  validate: [
    body('username')
      .trim()
      .notEmpty().withMessage('Please enter a username.')
      .escape(),
    body('password')
      .notEmpty().withMessage('Please enter a password.')
      .trim().escape()
  ],

  submit: asyncHandler(async (req, res, next) => {
    if (req.formErrors) return login.render(req, res, next)
    passport.authenticate('local', (err: Error, user: Express.User) => {
      if (err) return next(err)
      if (!user) {
        req.formErrors = { password: 'Incorrect username or password.' }
        return login.render(req, res, next)
      } else req.logIn(user, (err) => {
        if (err) return next(err)
        return res.redirect('/')
      })
    })(req, res, next)
  })
}

export default login