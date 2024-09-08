import { type Directory } from "@prisma/client";
import prisma from "../prisma";
import createDirectoryTree from './createDirectoryTree'

async function findAllFilesOfDirectory(directory: Directory) {
  const directoryTree = await createDirectoryTree(directory)
  const allFiles: string[] = []
  for (let directoryDetails of directoryTree) {
    if (!directoryDetails.id) break;
    const currentDirectory = await prisma.directory.findUnique({
      where: { id: directoryDetails.id },
      include: { files: true }
    })
    if (!currentDirectory) break;
    for (let file of currentDirectory.files) {
      allFiles.push(file.id)
    }
  }
  return allFiles
}

export default findAllFilesOfDirectory