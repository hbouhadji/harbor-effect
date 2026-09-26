import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { DateTime, Effect, FileSystem, Path, Schema } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

const instruction = 'Create a file called hello.txt with "Hello, world!" as the content.';

const agent = 'opencode';
const provider = 'opencode';
const model = 'muse-spark-1.3-contributor-free';

const jobsDir = 'jobs';

const taskToml = `schema_version = "1.4"

[verifier]
timeout_sec = 120.0

[agent]
timeout_sec = 600.0

[environment]
build_timeout_sec = 600.0
`;

const dockerfile = `FROM ubuntu:24.04

WORKDIR /app
`;

const testScript = `#!/bin/bash

if [ "$(cat /app/hello.txt 2>/dev/null)" = "Hello, world!" ]; then echo 1; else echo 0; fi > /logs/verifier/reward.txt
`;

class Trajectory extends Schema.Class<Trajectory>("harbor-effect/Trajectory")({
  schema_version: Schema.String,
  session_id: Schema.String,
  agent: Schema.Struct({
    name: Schema.String,
    version: Schema.String,
  }),
  steps: Schema.Array(Schema.Unknown),
}) {}

const decodeTrajectory = Schema.decodeUnknownEffect(Schema.fromJsonString(Trajectory));

class HarborRunError extends Schema.TaggedError<HarborRunError>()("HarborRunError", {
  exitCode: Schema.Number,
}) {}

class TrajectoryNotFound extends Schema.TaggedError<TrajectoryNotFound>()("TrajectoryNotFound", {
  jobDir: Schema.String,
}) {}

const writeTask = Effect.fn("writeTask")(function* (instruction: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const taskDir = yield* fs.makeTempDirectoryScoped({ prefix: "harbor-task-" });
  yield* fs.makeDirectory(path.join(taskDir, "environment"));
  yield* fs.makeDirectory(path.join(taskDir, "tests"));
  yield* fs.writeFileString(path.join(taskDir, "instruction.md"), instruction);
  yield* fs.writeFileString(path.join(taskDir, "task.toml"), taskToml);
  yield* fs.writeFileString(path.join(taskDir, "environment", "Dockerfile"), dockerfile);
  yield* fs.writeFileString(path.join(taskDir, "tests", "test.sh"), testScript, { mode: 0o755 });

  return taskDir;
});

const runHarbor = Effect.fn("runHarbor")(function* (taskDir: string, jobName: string) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

  const exitCode = yield* spawner.exitCode(
    ChildProcess.make(
      "uvx",
      [
        "harbor", "run",
        "--path", taskDir,
        "--agent", agent,
        "--model", `${provider}/${model}`,
        "--jobs-dir", jobsDir,
        "--job-name", jobName,
        "--yes",
      ],
      { stdout: "inherit", stderr: "inherit" },
    ),
  );

  if (exitCode !== ChildProcessSpawner.ExitCode(0)) {
    return yield* new HarborRunError({ exitCode });
  }
});

const readTrajectory = Effect.fn("readTrajectory")(function* (jobName: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const jobDir = path.join(jobsDir, jobName);
  for (const entry of yield* fs.readDirectory(jobDir)) {
    const trialDir = path.join(jobDir, entry);
    if ((yield* fs.stat(trialDir)).type !== "Directory") continue;

    const trajectoryPath = path.join(trialDir, "agent", "trajectory.json");
    if (yield* fs.exists(trajectoryPath)) {
      return yield* decodeTrajectory(yield* fs.readFileString(trajectoryPath));
    }
  }

  return yield* new TrajectoryNotFound({ jobDir });
});

const program = Effect.gen(function* () {
  const now = yield* DateTime.now;
  const jobName = `simple-task-${DateTime.formatIso(now).replace(/[:.]/g, "-")}`;

  const taskDir = yield* writeTask(instruction);
  yield* runHarbor(taskDir, jobName);

  const trajectory = yield* readTrajectory(jobName);
  yield* Effect.log(`trajectory ${trajectory.session_id}: ${trajectory.steps.length} steps`);
}).pipe(Effect.scoped, Effect.provide(NodeServices.layer));

NodeRuntime.runMain(program);
