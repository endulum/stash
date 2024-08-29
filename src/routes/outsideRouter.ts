import express from 'express';
import asyncHandler from 'express-async-handler';

const router = express.Router();

router.route('/')
  .get(asyncHandler(async (req, res) => {
    res.send('not logged in')
  }))

// UNAUTHENTICATED
// router.route('/')
//   .get(renderSplash)
// router.route('/login')
//   .get(renderLogin)
//   .post(validateLoginForm, handleLoginForm)
// router.route('/signup')
//   .get(renderSignup)
//   .post(validateSignupForm, handleSignupForm)
// router.route('*')
//   .all(asyncHandler(async (req, res) => res.redirect('/')))

export default router;