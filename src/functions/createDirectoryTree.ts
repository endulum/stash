import type { Directory } from '@prisma/client'
import prisma from '../prisma'

export default async function createDirectoryTree(
  directory: Directory | null
): Promise<Array<{ name: string, id: null | string }>> {
  const queue: Array<{ name: string, id: null | string }> = directory 
    ? [{ name: directory.name + '/', id: directory.id }] 
    : [{ name: '/', id: null }]
  const results: Array<{ name: string, id: null | string }> = []
  do {
    const currentDirectory = queue.pop()
    if (currentDirectory) {
      results.push(currentDirectory)
      const childDirectories = await prisma.directory.findMany({
        where: { parentId: currentDirectory.id }
      })
      if (childDirectories.length > 0) {
        childDirectories.forEach(child => {
          queue.push({ name: currentDirectory.name + child.name + '/', id: child.id })
        })
      }
    }
  } while (queue.length > 0);
  return results
}