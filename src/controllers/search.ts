import { type RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { ValidationChain, query } from "express-validator";
import bcrypt from 'bcryptjs'
import type { File, Directory } from "@prisma/client";

import prisma from '../prisma'

export const validation: ValidationChain[] = [
  query('name')
    .trim()
    .escape(),
  query('type')
    .trim()
    .escape()
]

export const controller: Record<string, RequestHandler> = {
  renderSearch: asyncHandler(async (req, res) => {
    if (!req.user) {
      req.flash('warning', 'You must be logged in to search your files.')
      return res.redirect('/login')
    }
    let results: Array<File | Directory> = []
    const defaultParams = { 
      name: { contains: req.query.name as string },
      authorId: req.user.id
    }
    if ('type' in req.query) {
      const selectedType = (req.query.type as string).replace(/&#x2F;/g, '/')
      switch (selectedType) {
        case 'directory':
          results = await prisma.directory.findMany({ where: defaultParams }); 
          break;
        case 'shared directory':
          results = await prisma.directory.findMany({ 
            where: {
              ...defaultParams,
              AND: [
                { shareUntil: { not: null } },
                { shareUntil: { gte: new Date() } }
              ]
            }
          }); 
          break;
        case 'any':
          const directoryResults = await prisma.directory.findMany({ where: defaultParams });
          const fileResults = await prisma.file.findMany({ 
            where: defaultParams,
            include: { directory: true }
          });
          results = [...directoryResults, ...fileResults];
          break;
        default:
          results = await prisma.file.findMany({
            where: {
              ...defaultParams,
              type: selectedType
            },
            include: { directory: true }
          })
      }
    }

    // prepare the Unique Types dropdown
    const fileTypes = (await prisma.file.findMany({
      distinct: ['type'],
      select: { type: true }
    })).map(type => type.type)
    //uniqueTypes.unshift('any', 'directory', 'shared directory')

    return res.render('layout', {
      page: 'pages/read/read-search',
      title: 'Search Your Files',
      fileTypes,
      results,
      prevForm: req.query,
      formErrors: null
    })
  }),
}