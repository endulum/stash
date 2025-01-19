import { faker } from "@faker-js/faker";

export type BulkDirectoryData = {
  name: string;
};

export type BulkFileData = {
  name: string;
  type: string;
  ext: string;
  size: number;
};

export function randSize() {
  return Math.floor(Math.random() * 5242880); // bytes in 5mb
}

export function bulkDirectories(count: number): BulkDirectoryData[] {
  const directoryNames: string[] = [];
  while (directoryNames.length < count) {
    const directoryName = (faker.hacker.adjective() + " " + faker.hacker.noun())
      .split(" ")
      .join("_");
    if (directoryNames.includes(directoryName) || directoryName.length > 32)
      continue;
    directoryNames.push(directoryName);
  }

  return directoryNames.map((name) => ({ name }));
}

export function bulkFiles(count: number): BulkFileData[] {
  const files: BulkFileData[] = [];
  while (files.length < count) {
    const name = faker.system.fileName().split(".")[0];
    const type = faker.system.mimeType();
    const ext = faker.system.fileExt(type);
    if (
      files.find((f) => f.ext === type && f.name === name) !== undefined ||
      name.length > 32
    )
      continue;
    else files.push({ name, type, ext, size: randSize() });
  }
  return files;
}
