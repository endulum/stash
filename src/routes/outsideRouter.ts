import express, { type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import passport from 'passport';

const router = express.Router();

const renderLogin = asyncHandler(async (req, res, next) => {
  return res.render('outside', {
    page: 'outside/login',
    title: 'Log In',
    prevForm: req.body,
    formErrors: req.formErrors,
    formMessage: req.formMessage
  })
})

const validateLoginForm = [
  body('username')
    .trim()
    .notEmpty().withMessage('Please enter a username.')
    .escape(),
  body('password')
    .notEmpty().withMessage('Please enter a password.')
    .trim().escape()
]

const handleValidationErrors = asyncHandler(async (req, res, next) => {
  const errorsArray = validationResult(req).array()
  if (errorsArray.length > 0) {
    req.formErrors = {}
    errorsArray.forEach(error => {
      if (req.formErrors && error.type === 'field') 
        req.formErrors[error.path] = error.msg
    })
  }
  return next()
})

const handleLoginForm = asyncHandler(async (req, res, next) => {
  if (req.formErrors) return renderLogin(req, res, next)
  passport.authenticate('local', (err: Error, user: Express.User) => {
    if (err) return next(err)
    if (!user) {
      req.formErrors = { password: 'Incorrect username or password.' }
      return renderLogin(req, res, next)
    } else req.logIn(user, (err) => {
      if (err) return next(err)
      return res.redirect('/')
    })
  })(req, res, next)
})

const renderSignup = asyncHandler(async (req, res, next) => {
  return res.render('outside', {
    page: 'outside/signup',
    title: 'Sign Up',
    prevForm: req.prevForm,
    formErrors: req.formErrors,
    formMessage: req.formMessage
  })
})

router.route('/login')
  .get(renderLogin)
  .post(validateLoginForm, handleValidationErrors, handleLoginForm)
router.route('/signup')
  .get(renderSignup)
//   .post(validateSignupForm, handleSignupForm)
router.route('*')
  .all(asyncHandler(async (req, res) => res.redirect('/login')))

export default router;