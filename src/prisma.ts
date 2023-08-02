import { Result, isFailure, isSuccess } from "./types.js";
import { resolvedSecretsManager } from "./secrets.js";

type ErrorFormat = "minimal" | "pretty";
type DataSources = { db: string };

class PrismaClient {
  errorFormat: ErrorFormat;
  datasources: DataSources;

  constructor({
    errorFormat,
    datasources,
  }: {
    errorFormat: ErrorFormat;
    datasources: DataSources;
  }) {
    this.errorFormat = errorFormat;
    this.datasources = datasources;
  }
}

type PrismaClients = {
  read: PrismaClient;
  write: PrismaClient;
};

let resolvedPrisma: Result<PrismaClients>;

if (isSuccess(resolvedSecretsManager)) {
  const { result: secrets } = resolvedSecretsManager;
  try {
    const readWriteUrl = await secrets.getSecret("readWriteUrl");
    const readOnlyUrl = await secrets.getSecret("readOnlyUrl");

    const write = new PrismaClient({
      errorFormat: "minimal",
      datasources: { db: readWriteUrl },
    });

    const read = new PrismaClient({
      errorFormat: "minimal",
      datasources: { db: readOnlyUrl },
    });

    resolvedPrisma = { result: { read, write } };
  } catch (error) {
    const { message } =
      error instanceof Error ? error : { message: "unknown error" };
    resolvedPrisma = { failures: [message] };
  }
} else {
  resolvedPrisma = { failures: resolvedSecretsManager.failures };
}

export { resolvedPrisma };
