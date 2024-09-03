import prisma from '../prisma'

export default async function buildFolderTree(): Promise<Array<{ name: string, id: null | string }>> {
  const queue: Array<{ name: string, id: null | string }> = [
    { name: '/', id: null }
  ]
  const results: Array<{ name: string, id: null | string }> = []
  do {
    const currentFolder = queue.pop()
    if (currentFolder) {
      results.push(currentFolder)
      const childFolders = await prisma.folder.findMany({
        where: { parentId: currentFolder.id }
      })
      if (childFolders.length > 0) {
        childFolders.forEach(child => {
          queue.push({ name: currentFolder.name + child.name + '/', id: child.id })
        })
      }
    }
  } while (queue.length > 0)
  return results
}