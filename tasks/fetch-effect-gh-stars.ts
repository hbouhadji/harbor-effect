import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import { runTask } from "../src/lib/harbor.ts";

const instruction = 'Fetch the number of GitHub stars of the effect-ts/effect repository and write only that number to /app/stars.txt.';

const agent = 'opencode';
const model = 'opencode/muse-spark-1.3-contributor-free';

const dockerfile = `FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl jq && rm -rf /var/lib/apt/lists/*

WORKDIR /app
`;

// Accepts answers within ±1% of the live count, since stars can change during the run.
const testScript = `#!/bin/bash
set -o pipefail

expected=$(curl -fsSL https://api.github.com/repos/effect-ts/effect | jq -er .stargazers_count)
if [ $? -ne 0 ]; then
  echo "GitHub API request failed"
  echo 0 > /logs/verifier/reward.txt
  exit 1
fi

actual=$(tr -d '[:space:]' < /app/stars.txt 2>/dev/null)
echo "expected=$expected actual=$actual"

if [[ "$actual" =~ ^[0-9]+$ ]] \\
  && [ $(( (actual - expected) * 100 )) -le "$expected" ] \\
  && [ $(( (expected - actual) * 100 )) -le "$expected" ]; then
  echo 1
else
  echo 0
fi > /logs/verifier/reward.txt
`;

const program = runTask({ name: "fetch-effect-gh-stars", instruction, dockerfile, testScript, agent, model });

NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)));
