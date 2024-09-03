import { type Folder } from "@prisma/client"
import prisma from '../prisma'

export default async function buildFolderPath(folder: Folder | null): Promise<Array<{ name: string, id: null | string }>> {
  let currentFolder: Folder | null = folder
  const folderPath: Array<{ name: string, id: null | string }> = []
  while (currentFolder) {
    folderPath.unshift({ name: currentFolder.name, id: currentFolder.id })
    const parentFolder = await prisma.folder.findUnique({
      where: { id: currentFolder.parentId || 'why doesnt this work with null?' }
    })
    currentFolder = parentFolder
  }
  return folderPath
}