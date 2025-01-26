import {
  type Prisma,
  type FileSort,
  type FileSortOrder,
  type DirSort,
  type DirSortOrder,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { client } from "../client";

export async function create({
  username,
  password,
  githubId,
  githubUser,
}: {
  username: string;
  password?: string;
  githubId?: number;
  githubUser?: string;
}) {
  if (githubId && githubUser) {
    const { id } = await client.user.create({
      data: { username, githubId, githubUser },
    });
    await client.userSettings.create({
      data: { userId: id },
    });
    return id;
  } else {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password ?? "password", salt);
    const { id } = await client.user.create({
      data: { username, password: hashedPassword },
    });
    await client.userSettings.create({
      data: { userId: id },
    });
    return id;
  }
}

export async function find({
  id,
  username,
  githubId,
}: {
  id?: number;
  username?: string;
  githubId?: number;
}) {
  const OR: Prisma.UserWhereInput[] = [];
  if (id && !Object.is(id, NaN)) OR.push({ id });
  if (username) OR.push({ username });
  if (githubId) OR.push({ githubId });
  return client.user.findFirst({
    where: { OR },
    include: { settings: true },
  });
}

export async function comparePassword({
  userData,
  password,
}: {
  userData: string | { password: string | null };
  password: string;
}) {
  let user: { password: string | null } | null = null;
  if (typeof userData === "string") {
    user = await client.user.findUnique({
      where: { username: userData },
    });
    if (!user) return false;
  } else user = userData;
  if (!user.password) return false;
  const match = await bcrypt.compare(password, user.password);
  return match;
}

export async function update({
  userData,
  body,
}: {
  userData: { username?: string; id?: number };
  body: {
    username?: string;
    password?: string;
    sortFiles?: FileSort;
    sortFilesDirection?: FileSortOrder;
    sortDirs?: DirSort;
    sortDirsDirection?: DirSortOrder;
  };
}) {
  await client.user.update({
    where: userData.username
      ? { username: userData.username }
      : { id: userData.id },
    data: {
      ...(body.username && { username: body.username }),
      ...(body.password && {
        password: await bcrypt.hash(body.password, await bcrypt.genSalt(10)),
      }),
      settings: {
        update: {
          ...(body.sortFiles && { sortFiles: body.sortFiles }),
          ...(body.sortFilesDirection && {
            sortFilesDirection: body.sortFilesDirection,
          }),
          ...(body.sortDirs && { sortDirs: body.sortDirs }),
          ...(body.sortDirsDirection && {
            sortDirsDirection: body.sortDirsDirection,
          }),
        },
      },
    },
  });
}

export async function updateGithubUser(id: number, githubUser: string) {
  await client.user.update({
    where: { id },
    data: { githubUser },
  });
}

export async function del(id: number) {
  await client.user.delete({
    where: { id },
  });
}
