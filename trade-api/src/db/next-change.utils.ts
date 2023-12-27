import { prisma } from "./db.ts";

const NEXT_CHANGE_PK = "NextChangeId";

export async function getNextChangeId(): Promise<string | undefined> {
  const result = await prisma.appState.findUnique({
    where: {
      key: NEXT_CHANGE_PK,
    },
  });

  console.log("GET NEXT CHANGE ID", result);
  return result?.value ?? undefined;
}

export async function setNextChangeId(nextChangeId: string): Promise<void> {
  await prisma.appState.upsert({
    create: {
      key: NEXT_CHANGE_PK,
      value: nextChangeId,
    },
    update: {
      key: NEXT_CHANGE_PK,
      value: nextChangeId,
    },
    where: {
      key: NEXT_CHANGE_PK,
    },
  });
}
