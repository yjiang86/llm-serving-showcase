# A100 / H100 LLM Serving Engineering

A private engineering showcase of AI-assisted work on multi-node LLM serving,
native Anthropic/MCP integration, and reliable streamed-response handling.

The runnable component is an existing GLM-5.2 MCP client repair candidate.
Its source is preserved exactly; the package adds portable entry points,
documentation and existing offline checks. Its owner disposition is
**PREPARATION_ACCEPTED_NOT_APPLIED**. Current GPU service availability is
**not established by this package**.

## What this demonstrates

- Separating GPU resource admission and runtime ownership from client/API acceptance.
- Planning precision, context and output budgets for A100/H100 serving workflows.
- Exposing a bounded secondary-model tool through stdio MCP.
- Distinguishing a complete SSE message from a truncated HTTP response.
- Preserving negative results and tying validation to exact source bytes.

[Architecture](docs/architecture.md) · [Evidence and limits](docs/evidence-and-limits.md)
· [Validation](VALIDATION.md) · [Application bullets](APPLICATION_BULLETS.md)

## Run the offline checks

Requires Node.js 20 or later. These checks use built-in Node modules, a mocked
SDK and a synthetic HTTP boundary. They open no listener, contact no endpoint,
read no real credential file and invoke no model.

```sh
node --check client/server_sglang_anthropic.mjs
node tests/bridge_stream_fixture_20260930.mjs client/server_sglang_anthropic.mjs
node tests/bridge_stream_compat_20260930.mjs client/server_sglang_anthropic.mjs
```

The second command replays the original twelve cases; the third replays six
additional compatibility cases. Exported results are in [evidence/](evidence/).
The commands above print fresh results without overwriting those records.

## Optional integration with an existing endpoint

These instructions are documentation; live integration was not run for this
delivery. The sample does not install or launch an LLM, scheduler job or
network listener. Obtain an appropriate existing endpoint and model identity
from its runtime owner.

```sh
npm --prefix client ci --ignore-scripts --no-audit --no-fund
export GLM52_BASE_URL="https://example.invalid/v1"
export GLM52_MODEL="YOUR_SERVED_MODEL_ID"
export GLM52_API_KEY_FILE="PATH_TO_A_LOCAL_SECRET_FILE"
node client/server_sglang_anthropic.mjs
```

Configure the calling MCP client to launch the same command and provide the
environment variables. The adapter provides `glm52_status` and `glm52_ask`;
[examples/ask.json](examples/ask.json) is a tool-argument example, not a claimed
model response. The preferred adapter speaks native Anthropic Messages/SSE.
It does not replace the coding assistant's primary model or provide a general
catalog of models and reasoning efforts.

## Contribution and ownership

Project-owner responsibilities cover problem framing, system/resource
trade-offs and acceptance/claim boundaries. Implementation, diagnosis and
test execution were AI-assisted across specialized tasks. The source sample
and validation records describe project work rather than sole manual
authorship. GPU capacity was provided through managed allocations; hardware
ownership is not claimed.

## Contents and exclusions

This snapshot contains selected client source, dependency manifests, existing
offline checks and sanitized evidence. It contains no model weights, container
images, scheduler scripts, host configuration, raw chats, review packages,
credentials or original repository history.

No repository-level open-source license has been added. Dependency metadata
and limitations are documented in [DEPENDENCIES.md](DEPENDENCIES.md).
