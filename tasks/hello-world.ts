import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import { runTask } from "../src/lib/harbor.ts";

const instruction = 'Create a file called hello.txt with "Hello, world!" as the content.';

const agent = 'opencode';
const provider = 'opencode';
const model = 'muse-spark-1.3-contributor-free';

const dockerfile = `FROM ubuntu:24.04

WORKDIR /app
`;

const testScript = `#!/bin/bash

if [ "$(cat /app/hello.txt 2>/dev/null)" = "Hello, world!" ]; then echo 1; else echo 0; fi > /logs/verifier/reward.txt
`;

const program = runTask({ name: "hello-world", instruction, dockerfile, testScript, agent, provider, model });

NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)));
