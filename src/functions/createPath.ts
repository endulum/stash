import { type Directory, type File } from "@prisma/client"
import prisma from '../prisma'

export default async function createPath(
  directory: Directory | null
): Promise<Array<{ name: string, id: null | string }>> {
  let currentDirectory: Directory | null = directory
  const path: Array<{ name: string, id: null | string }> = []
  while (currentDirectory) {
    path.unshift({ name: currentDirectory.name, id: currentDirectory.id })
    const parentDirectory = await prisma.directory.findUnique({
      where: { id: currentDirectory.parentId || '' }
    })
    currentDirectory = parentDirectory
  }
  return path
}

export async function createFilePath(
  file: File
): Promise<Array<{ name: string, id: null | string }>> {
  let directoryPath = null
  if (file.directoryId !== null) {
    const parentDirectory = await prisma.directory.findUnique({
      where: { id: file.directoryId }
    })
    directoryPath = await createPath(parentDirectory)
    directoryPath.push({ name: file.name + '.' + file.ext, id: file.id })
  }
  return directoryPath ?? [{ name: file.name + '.' + file.ext, id: file.id }]
}