import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Table } from "dynamodb-toolbox";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export const documentClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: "eu-central-1",
  }),
  {
    marshallOptions: {
      convertEmptyValues: false,
    },
  },
);

export const mirroredPoeTradeTable = new Table({
  DocumentClient: documentClient,
  name: "MirroredPoeTradeV2",
  partitionKey: "pk",
  sortKey: "sk",
  indexes: {
    itemIdIndex: {
      partitionKey: "id",
    },
    itemNameIndex: {
      partitionKey: "name",
    },
    itemNameAndLeagueIndex: {
      partitionKey: "itemNameAndLeague",
    },
    stashAccountNameIndex: {
      partitionKey: "stash_accountName",
    },
    stashIdIndex: {
      partitionKey: "stash_id",
    },
    stashLeagueIndex: {
      partitionKey: "stash_league",
    },
  },
});
