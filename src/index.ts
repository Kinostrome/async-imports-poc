import { resolvedPrisma } from "./prisma.js";
import { isFailure } from "./types.js";

if (isFailure(resolvedPrisma)) {
  console.error("Failed to initialize prisma:", resolvedPrisma.failures);
  process.exit(1);
}

const { result: clients } = resolvedPrisma;

console.log("prisma.write is", clients.write);
console.log("prisma.read is", clients.read);
