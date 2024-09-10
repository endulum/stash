import express, { type Response } from 'express';
import asyncHandler from 'express-async-handler';

import signup from '../controllers/signup'
import login from '../controllers/login'
import handleValidationErrors from '../middleware/handleValidationErrors'

const router = express.Router();

router.route('/')
  .get(asyncHandler(async (req, res) => res.redirect('/login')))
router.route('/login')
  .get(login.render)
  .post(login.validate, handleValidationErrors, login.submit)
router.route('/signup')
  .get(signup.render)
  .post(signup.validate, handleValidationErrors, signup.submit)
router.route('*')
  .all(asyncHandler(async (req, res) => {
    req.flash('warning', 'You must be logged in to access this page.')
    res.redirect('/login')
  }))

export default router;