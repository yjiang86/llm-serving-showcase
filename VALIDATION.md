# Validation

Export verification timestamp (UTC): 2026-11-09T05:02:32.806914+00:00.

Runtime used for offline checks: Node.js v24.22.1.

| Check | Actual result |
| --- | --- |
| Client syntax: `node --check client/server_sglang_anthropic.mjs` | PASS |
| Original twelve synthetic cases | 12/12 PASS |
| Portable default-path/candidate-hash entry point | 12/12 PASS |
| Separate compatibility cases | 6/6 PASS |
| Client source SHA-256 equals preserved candidate | MATCH |
| Package dependency map equals preserved lockfile root | MATCH |
| Real endpoint/SDK/model/GPU acceptance | NOT RUN |
| Dependency installation | NOT RUN |

The checks execute the existing client handler inside a VM with mocked SDK and
HTTP transport. The fixture injects a synthetic nonsecret credential and
rejects real credential-file access. It creates no listener and contacts no
network or model. Each case asserts one synthetic request and no automatic
retry. These results do not establish a current online service.

Re-run the commands in README without an output-file argument to print new
results while preserving the exported evidence files.
