# tasks

### Hello world

[`hello-world.ts`](hello-world.ts) asks the agent to create `hello.txt` containing `Hello, world!`, and checks the file content.

```sh
node hello-world.ts
```

### Fetch Effect's GitHub stars

[`fetch-effect-gh-stars.ts`](fetch-effect-gh-stars.ts) asks the agent to fetch the star count of `effect-ts/effect` and write it to `/app/stars.txt`. The verifier compares it with the live GitHub API count, within ±1%.

```sh
node fetch-effect-gh-stars.ts
```
