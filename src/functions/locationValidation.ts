import { body } from "express-validator"
import prisma from '../prisma'

const locationValidation = body('location')
  .trim()
  .notEmpty().withMessage('Please choose a location for this file.').bail()
  .custom(async (value, { req }) => {
    if (value !== 'home') {
      const existingDirectory = await prisma.directory.findUnique({
        where: { id: value, authorId: req.user.id }
      })
      if (!existingDirectory)
        throw new Error('Selected location could not be found or does not belong to you.')
      if (req.currentDirectory && value === req.currentDirectory.id)
        throw new Error('A directory cannot be a parent of itself.')
    }
  })
  .escape()

export default locationValidation