import { Result } from "./types.js";
import { getErrorMessage, simulateRandomFailure, wait } from "./utils.js";

type SecretsManager = Awaited<ReturnType<typeof getSecretsManager>>;

async function getSecretsManager() {
  await wait(3 * 1000);
  simulateRandomFailure("SecretsManager initialization timed out");

  async function getSecret(key: string) {
    await wait(3 * 1000);
    simulateRandomFailure(`Secret retrieval failed for ${key}`);

    return `secret:${key}`;
  }

  return {
    getSecret,
  };
}

let resolvedSecretsManager: Result<SecretsManager>;

try {
  resolvedSecretsManager = { result: await getSecretsManager() };
} catch (error) {
  const message = getErrorMessage(error);
  resolvedSecretsManager = { failures: [message] };
}

export { resolvedSecretsManager };
