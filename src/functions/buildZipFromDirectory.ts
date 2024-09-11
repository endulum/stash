import { type Directory } from '@prisma/client';
import Zip from 'adm-zip'

import prisma from '../prisma';
import supabase from '../supabase'
import createDirectoryTree from './createDirectoryTree';

async function buildZipFromDirectory(directory: Directory | null): Promise<Buffer> {
  const zip = new Zip()

  const directoryTree = await createDirectoryTree(directory)

  for (let directoryDetails of directoryTree) {
    if (!directoryDetails.id) continue;
    const currentDirectory = await prisma.directory.findUnique({
      where: { id: directoryDetails.id },
      include: { files: true, directories: true }
    })
    if (!currentDirectory) break;

    // keep empty directories by adding a hidden '.keep' to them
    if (currentDirectory.files.length === 0 && currentDirectory.directories.length === 0) {
      zip.addFile(directoryDetails.name + '/.keep', Buffer.from(''))
    }
    
    for (let file of currentDirectory.files) {
      const { data, error } = await supabase.storage
        .from('uploader')
        .download(file.id)
      if (error) {
        console.error(error)
        throw new Error('Problem downloading this file.')
      } else {
        const buffer = Buffer.from(await data.arrayBuffer())
        zip.addFile(directoryDetails.name + file.name + '.' + file.ext, buffer)
      }
    }
  }
  const buffer = zip.toBuffer()
  return buffer
}

export default buildZipFromDirectory