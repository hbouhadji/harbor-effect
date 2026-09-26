# harbor-effect

> **Alpha:** expect breaking changes.

An experiment in wrapping [Harbor](https://github.com/harbor-framework/harbor) with [Effect](https://effect.website) to run my own evals. The developer experience is still a work in progress.

## Motivation

- Learn Effect.
- Easily run my own evals against every new model that comes out, especially the cheap ones.
- Collect KPIs such as output tokens as structured data.

## Examples

Each file in [`tasks/`](tasks) defines a task (instruction, Docker environment, verifier script, agent and model) and runs it with `runTask` from [`src/lib/harbor.ts`](src/lib/harbor.ts). `runTask` generates a temporary Harbor task, runs it with `uvx harbor run`, and returns the decoded [ATIF](https://github.com/harbor-framework/harbor) trajectory. Results are written to `jobs/`.

Requires Docker and [uv](https://docs.astral.sh/uv/).

## Roadmap

- Wrap more of Harbor's API with Effect (sandboxes, etc.).
- Codegen between harbor and effect schema
- Write verifiers entirely in Effect. (instead of the verifier from harbor)
- Add a sandbox that runs directly on my Mac using macOS Seatbelt, since some things can only be tested on macOS and I don't want to depend on cloud services.
- Build a simple GUI.
