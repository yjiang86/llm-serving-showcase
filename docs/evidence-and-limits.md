# Evidence and limits

## Primary source for the selected component

The owner-retained repair disposition is `PREPARATION_ACCEPTED_NOT_APPLIED`.
The exported client has SHA-256
`426d3d2d93f3a8888b5a35916068d70602d23fe6d395a9f210aed25ed4affe3b`.
It is an existing private candidate, not a newly installed or released runtime.

The original twelve-case synthetic HTTP-boundary evaluation recorded:

| Subject | Result |
| --- | --- |
| Existing baseline | 4/12 passed; eight false-completion reproductions |
| Repair candidate | 12/12 passed |
| Separate compatibility cases | 6/6 passed |

The negative record is preserved in
[evidence/baseline-negative.redacted.json](../evidence/baseline-negative.redacted.json).
Only its host-local source path is replaced with a logical label. Original
record identities and source transformations are listed in
[SOURCE_PROVENANCE.json](../SOURCE_PROVENANCE.json).

The exported checks retain the original expectations and cases. Portable
default-path/source-hash bindings are documented separately from the test
oracle. The compatibility check covers ping/unknown events, multibyte UTF-8
boundaries, CRLF delimiters, truncation, explicit errors and missing stop reasons.

## Current export verification

See [VALIDATION.md](../VALIDATION.md) and the two candidate JSON records.
These are offline synthetic checks. They use a mocked MCP SDK and HTTP
transport; they do not call a model, open a listener or access a real secret.

## Historical deployment claims

The original repository retains a curated A100/H100 deployment history and a
source manifest. Raw operational artifacts are deliberately outside this
showcase. Quantitative historical context/throughput claims and historical agent-loop
outcomes are omitted from the application bullets because their original run
artifacts were not located and rehashed during this delivery. No current online-service claim is made.

## Remaining limitations

- Real SDK/endpoint integration, cancellation under load, latency,
  thinking/tool streams and a full protocol state machine were not run here.
- The pre-existing non-2xx error-body snippet path is unchanged. Error-body
  redaction remains a known limitation; no runtime credential-privacy PASS is claimed.
- GPU deployment, model licensing, live resource availability and cleanup
  acceptance are outside this source sample.
- Upstream dependency installation is documented but not executed in this
  packaging task. No dependency code or packaged runtime is redistributed.
