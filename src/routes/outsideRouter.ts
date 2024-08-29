import express, {type Response} from 'express';
import asyncHandler from 'express-async-handler';

const router = express.Router();

const renderLogin = asyncHandler(async (req, res, next) => {
  return res.render('outside', {
    page: 'outside/login',
    title: 'Log In',
    prevForm: req.prevForm,
    formErrors: req.formErrors,
    formMessage: req.formMessage
  })
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
//   .post(validateLoginForm, handleLoginForm)
router.route('/signup')
  .get(renderSignup)
//   .post(validateSignupForm, handleSignupForm)
router.route('*')
  .all(asyncHandler(async (req, res) => res.redirect('/login')))

export default router;