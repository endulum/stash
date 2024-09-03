import { body } from "express-validator"
import prisma from '../prisma'

const locationValidation = body('location')
  .trim()
  .notEmpty().withMessage('Please choose a location for this file.').bail()
  .custom(async (value, { req }) => {
    if (value !== 'home') {
      const existingFolder = await prisma.folder.findUnique({
        where: { id: value, authorId: req.user.id }
      })
      if (!existingFolder) throw new Error('Selected location could not be found or does not belong to you.')
    }
  })
  .escape()

export default locationValidation