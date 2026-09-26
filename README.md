# harbor-effect

> **Alpha:** expect breaking changes.

An experiment in wrapping [Harbor](https://github.com/harbor-framework/harbor) with [Effect](https://effect.website) to run my own evals. The developer experience is still a work in progress.

## Motivation

- Learn Effect.
- Easily run my own evals against every new model that comes out, especially the cheap ones.
- Collect KPIs such as output tokens as structured data.

## Roadmap

- Wrap more of Harbor's API with Effect (sandboxes, etc.).
- Codegen between harbor and effect schema
- Write verifiers entirely in Effect.
- Add a sandbox that runs directly on my Mac using macOS Seatbelt, since some things can only be tested on macOS and I don't want to depend on cloud services.
- Build a simple GUI.
