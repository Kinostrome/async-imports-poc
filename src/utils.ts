export const wait = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred";
}

export function simulateRandomFailure(descriptor: string) {
  const random = Math.random();

  if (random > 0.01 && random < 0.11) {
    throw new Error(descriptor);
  }
}
