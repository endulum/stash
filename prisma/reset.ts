import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import bcrypt from 'bcryptjs'
import fs from 'fs/promises'
import path from 'path'
import mime from 'mime-types'

import dotenv from 'dotenv'
dotenv.config({ path: '.env.development' })

const prisma = new PrismaClient({ 
  log: ['query'],
  datasources: { db: { url: process.env.DATABASE_URL } }
});

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_KEY as string,
  {
    auth: {
      debug: true
    }
  }
)

async function main() {
  await clearDatabase()
  await generateAdmin()
  // await fillDatabaseWithSamples()
}

async function clearDatabase() {
  await prisma.user.deleteMany()
  await prisma.directory.deleteMany()
  await prisma.file.deleteMany()
  const { data, error } = await supabase.storage.from('uploader')
    .list('development/')
  if (error) {
    console.error(error)
    throw new Error('Something went wrong trying to empty the development folder.')
  } else {
    await supabaseRemoveFiles(data.map(file => 'development/' + file.name))
  }
}

async function supabaseRemoveFiles(list: string[]) {
  console.log(list)
  const { data, error } = await supabase.storage.from('uploader')
    .remove(list)
  if (error) {
    console.error(error)
    throw new Error('Something went wrong trying to empty the development folder.')
  }
}

async function generateAdmin() {
  if (!process.env.ADMINPASS) return;
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(process.env.ADMINPASS, salt)
  await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      id: 1,
      role: 'ADMIN'
    }
  })
}

async function fillDatabaseWithSamples() {
  const pathToSamples = path.join(__dirname, 'sampleFiles/')

  async function recursiveFileReads(dir: string): Promise<void> {
    const currentDirectoryPath: string = dir.split('sampleFiles/')[1]
    // we need not look at the computer's own path to the sampleFiles directory,
    // so cut that half out and take everything after 'sampleFiles/'

    let currentDirectoryId: string | null = null
    
    // first, use this directory to create a Directory entry in the database.
    if (currentDirectoryPath !== '') { // if we are NOT at the root of sampleFiles/
      const directories = currentDirectoryPath.split('/') // get the directory ancestry
      if (directories.length > 1) { // if this directory has a parent
        const parentDirectory = await prisma.directory.findFirst({
          where: { name: directories[directories.length - 2] }
        }) // the second to last of this directory's ancestry is this directory's parent
        const currentDirectory = await prisma.directory.create({
          data: {
            name: directories[directories.length - 1],
            parentId: parentDirectory?.id,
            authorId: 1
          }
        })
        currentDirectoryId = currentDirectory.id
      } else { // if this directory is parentless
        const currentDirectory = await prisma.directory.create({
          data: {
            name: directories[0],
            parentId: null,
            authorId: 1
          }
        })
      }
    }

    // then, examine the contents of this directory.
    const contents = await fs.readdir(dir)
    contents.flatMap(async (item) => {
      const itemPath = path.join(dir, item)
      const stat = await fs.stat(itemPath)
      if (stat.isDirectory()) return recursiveFileReads(itemPath);
      // this item is a directory, read it instead of proceeding
      // if proceeding, create a File entry in the database   
      const type = mime.lookup(itemPath) || 'binary'
      const newFile = await prisma.file.create({
        data: {
          name: itemPath.substring(itemPath.lastIndexOf('/') + 1, itemPath.lastIndexOf('.')),
          ext: itemPath.substring(itemPath.lastIndexOf('.') + 1, undefined),
          type,
          size: stat.size,
          directoryId: currentDirectoryId,
          authorId: 1
        }
      })
      // then, upload the contents of the file to supabase
      const read = await fs.readFile(itemPath);
      const { data, error } = await supabase.storage.from('uploader')
        .upload('development/' + newFile.id, read, { contentType: type })
      if (error) { // if something went wrong uploading, get rid of the corresponding File entry
        console.error(error)
        await prisma.file.delete({ where: { id: newFile.id } })
      } else { // if everything's fine, update the corresponding File with the upload url
        const publicUrl = supabase.storage
          .from('uploader')
          .getPublicUrl(data?.path as string).data.publicUrl
        await prisma.file.update({
          where: { id: newFile.id },
          data: { url: publicUrl }
        })
      }
    })
  }
  // https://stackoverflow.com/questions/10049557/reading-all-files-in-a-directory-store-them-in-objects-and-send-the-object/73187002#73187002
  await recursiveFileReads(pathToSamples)
}

main()
  .catch(e => {
    console.error(e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });