# Proof of Concept: Top-Level Await for Loading Modules

This is a proof of concept to demonstrate one approach and the potential downsides of loading values from I/O boundaries with top-level await.

This approach came up due to the need on a project to start retrieving certain values asynchronously rather than synchronously.

Previously, all configuration values (including secrets), were passed through directly via `env`.

The project has begun migrating to AWS Secrets Manager, which requires an asynchronous call to retrieve each secret value, as well as an asynchronous step to initialize the secrets client to begin with.

A good example of these secrets are Prisma URLs, which for the moment contain the actual password to the database (for both read and write URLs).

Previously, we initialized the Prisma client once on import via the values from the `env`. This allowed us to directly export the client with a guarantee that it was already initialized by the time we retrieved it.

Now, we need to actually resolve the Prisma URLs asynchronously, which means we can't export the client directly.

One suggestion was to upgrade our dependencies to their versions that support top-level await in Node.

However, this comes with several trade-offs:

- It just feels a bit unclean / messy
- We're tightly coupling the process of module resolution with asynchronous application code that will make network calls
- Network calls can fail, timeout, etc. which means we don't actually get the elegant syntactic sugar we might think we'd get of just:
  `const prisma = new PrismaClient({ datasources: { db: await getSecret('prisma.writeUrl') }});`
  - It actually needs to be carefully wrapped in a try-catch with a strongly typed interface to ensure errors are handled properly by the importers of the module. (see below)
- We're also tightly coupling the process of module resolution with the process of initializing the secrets client, which is a bit of a leaky abstraction
- Error handling may be trickier since we're literally waiting on modules to resolve rather than just having an asynchronous `init` function fail.
- We have to closely manage every asynchronous call in a module that is imported everywhere, or we may end up with unhandled Promise rejections / crashing the server at start if any of our runtime guarantees fail.
  - Example runtime guarantee: the AWS Secrets Manager service is _always_ up and _always accessible_ when we're starting / deploying the server.
  - If something changes externally, such as permissions in AWS, we may not be able to resolve the secrets client, which means we can't resolve the Prisma URLs, which means we can't initialize the Prisma client, which means we can't start the server.
  - All of this is still a problem if we have an `init` method, but it feels like it's more manageable since it would happen in a single place rather than potentially in every module that imports the secrets client.

## Running the Code

### Install Dependencies

```
npm i
```

### Execute with `npm`

```
npm start
```

### Notes

This code will randomly generate failures to demonstrate the potential for how error handling would have to be done with top-level await.

The failures primarily happen in `secrets.ts`.

You can read that file and search for `simulateRandomFailure`, which when it randomly fails, will throw an error with the `descriptor` passed to that function as the message of the `Error`.

This example is written in a more functional style (a bit inspired by Rust) with a `Result<T>` type to demonstrate one way we'd have to track the progression of errors through imports.

This is because it does not seem that we're able to wrap an import module statement in a try-catch block. The only way to do this is to rely on dynamic imports, which also feels a bit messy.

Therefore this approach ensures that every async module import is typed as a `Result<T>` which then _must_ be handled by the caller. This forces developers to think through and handle failure cases for these async imports.

### Alternatives

If any of your top-level await calls are not properly guarded by try-catch blocks, you'll receive an unhandled Promise rejection along the lines of:
```
file:///js/top-level-await/build/utils.js:8
        throw new Error(descriptor);
              ^

Error: Secret retrieval failed for readWriteUrl
    at simulateRandomFailure (file:///js/top-level-await/build/utils.js:8:15)
    at Object.getSecret (file:///js/top-level-await/build/secrets.js:7:9)
    at async file:///js/top-level-await/build/prisma.js:11:22
```

and the process will exit.

This is due to the fact that the `import` statement cannot be wrapped in a try-catch. However, this fact presents an alternative approach—dynamic imports:
```ts

import { getErrorMessage } from "./utils.js";

try {
  const { resolvedPrisma } = await import("./prisma.js");
  const { result: clients } = resolvedPrisma;

  console.log("prisma.write is", clients.write);
  console.log("prisma.read is", clients.read);
} catch (error) {
  console.log("importing prisma failed:", getErrorMessage(error));
}

export {};
```

While this approach is feasible, dynamic imports are a different approach and are shifting the process of loading modules into a later phase of execution alongside the application code in the module itself—which could produce issues for developers expecting the same behavior as static import statements.

There is also some indication that Typescript typing can get a bit tricky with dynamic imports, however this would need to be validated before being certain that it is a potential issue.
