import { Entity } from "dynamodb-toolbox";
import { mirroredPoeTradeTable } from "./db";

const NEXT_CHANGE_PK = "NextChangeId";
const NextChange = new Entity({
  table: mirroredPoeTradeTable,
  name: "NextChange",
  attributes: {
    pk: {
      type: "string",
      partitionKey: true,
      hidden: true,
    },
    sk: {
      type: "string",
      sortKey: true,
      hidden: true,
    },
    nextChangeId: {
      type: "string",
      required: true,
    },
  },
});

export async function getNextChangeId(): Promise<string | undefined> {
  const result = await NextChange.get({
    pk: NEXT_CHANGE_PK,
    sk: NEXT_CHANGE_PK,
  });

  console.log("GET NEXT CHANGE ID", result);
  return result.Item?.nextChangeId ?? undefined;
}

export async function setNextChangeId(nextChangeId: string): Promise<void> {
  await NextChange.put({
    pk: NEXT_CHANGE_PK,
    sk: NEXT_CHANGE_PK,
    nextChangeId,
  });
}
