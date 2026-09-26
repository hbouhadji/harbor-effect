import { DateTime, Effect, FileSystem, Path, Schema } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

const jobsDir = 'jobs';

const taskToml = `schema_version = "1.4"

[verifier]
timeout_sec = 120.0

[agent]
timeout_sec = 600.0

[environment]
build_timeout_sec = 600.0
`;

export class Trajectory extends Schema.Class<Trajectory>("harbor-effect/Trajectory")({
  schema_version: Schema.String,
  session_id: Schema.String,
  agent: Schema.Struct({
    name: Schema.String,
    version: Schema.String,
  }),
  steps: Schema.Array(Schema.Unknown),
}) {}

const decodeTrajectory = Schema.decodeUnknownEffect(Schema.fromJsonString(Trajectory));

export class HarborRunError extends Schema.TaggedError<HarborRunError>()("HarborRunError", {
  exitCode: Schema.Number,
}) {}

export class TrajectoryNotFound extends Schema.TaggedError<TrajectoryNotFound>()("TrajectoryNotFound", {
  jobDir: Schema.String,
}) {}

export interface Task {
  readonly name: string;
  readonly instruction: string;
  readonly dockerfile: string;
  readonly testScript: string;
  readonly agent: string;
  readonly provider: string;
  readonly model: string;
}

const writeTask = Effect.fn("writeTask")(function* (task: Task) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const taskDir = yield* fs.makeTempDirectoryScoped({ prefix: "harbor-task-" });
  yield* fs.makeDirectory(path.join(taskDir, "environment"));
  yield* fs.makeDirectory(path.join(taskDir, "tests"));
  yield* fs.writeFileString(path.join(taskDir, "instruction.md"), task.instruction);
  yield* fs.writeFileString(path.join(taskDir, "task.toml"), taskToml);
  yield* fs.writeFileString(path.join(taskDir, "environment", "Dockerfile"), task.dockerfile);
  yield* fs.writeFileString(path.join(taskDir, "tests", "test.sh"), task.testScript, { mode: 0o755 });

  return taskDir;
});

const runHarbor = Effect.fn("runHarbor")(function* (task: Task, taskDir: string, jobName: string) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

  const exitCode = yield* spawner.exitCode(
    ChildProcess.make(
      "uvx",
      [
        "harbor", "run",
        "--path", taskDir,
        "--agent", task.agent,
        "--model", `${task.provider}/${task.model}`,
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

export const runTask = Effect.fn("runTask")(
  function* (task: Task) {
    const now = yield* DateTime.now;
    const jobName = `${task.name}-${DateTime.formatIso(now).replace(/[:.]/g, "-")}`;

    const taskDir = yield* writeTask(task);
    yield* runHarbor(task, taskDir, jobName);

    const trajectory = yield* readTrajectory(jobName);
    yield* Effect.log(`trajectory ${trajectory.session_id}: ${trajectory.steps.length} steps`);
    return trajectory;
  },
  Effect.scoped,
);
