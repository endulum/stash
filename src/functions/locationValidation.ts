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
      else {
        if (req.currentFolder) {
          if (value === req.currentFolder.id) throw new Error('A folder cannot be a parent of itself.')
        }
      }
    }
  })
  .escape()

export default locationValidation