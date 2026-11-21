# Kimi K3 on four H100 nodes: acceptance result and limits

Status: one bounded evaluation run passed its frozen acceptance contract on
2026-11-20. The test service was stopped by the run's own cleanup. This is a
record of that run, not a claim that a service is currently available.

This summary is derived from the project's private canonical record. It
contains no node identities, host paths, scheduler scripts, credentials,
endpoint addresses or raw logs. Retained receipts are identified only by
logical name, byte count and SHA-256.

## Setup

| Item | Value |
| --- | --- |
| Model | `moonshotai/Kimi-K3` at revision `a590ce090cb049c93a33dfe8c208ec652aa20503` |
| Serving engine | SGLang at commit `29481685462732237d80d86076d6563e1f658102` |
| Topology | 4 nodes, 8 H100 80GB each, TP32 / EP32 / PP1 / DP1 |
| Interface under test | Native Anthropic Messages, non-streaming and SSE |
| Run limits | one scheduler job, 8 h wall clock, 256 GPU-hours |
| Actual use | 1 h 42 min 46 s, 54.81 GPU-hours |
| Acceptance receipt | `PASS`, 499 endpoint calls |
| Cleanup receipt | confirmed; credential findings 0, scan complete, runtime key absent |

GPU capacity came from a managed allocation. Hardware ownership is not
claimed.

## What the run verified

Every item below comes from receipts written by the passing run itself.

- Model listing, non-streaming and SSE messages, token counting, text plus
  image input, and an assistant-history and tool round trip.
- Capacity tiers of 8,192, 32,768, 65,536 and 131,071 input tokens, each with
  one generated token, so a 131,072-token total was served.
- Exact retrieval of a hidden marker at 8,192, 32,768, 65,536 and 120,000
  target input tokens, each ending normally below a 4,096-token output
  budget.
- A pre-server check over all 32 GPU ranks showing NCCL on InfiniBand with
  GPUDirect RDMA. The complete service logs of all four ranks show the same
  transport and no socket transport.
- A full content hash of 96 weight shards before submission, the container
  image identity, and an unchanged model snapshot after acceptance.
- Valid self-hashes on every receipt, with the launch manifest, acceptance,
  post-acceptance snapshot and cleanup receipts referencing each other by
  matching SHA-256.

## Workload-shape profile

Each stage used 8,192 input tokens and 1,024 output tokens per request,
distinct deterministic prompts, one warm-up request and a cache flush before
measurement. Every request succeeded.

| Concurrency | Requests | Aggregate output tok/s | TTFT p50 (s) | TTFT p95 (s) | Per-user tok/s mean |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 16 | 26.35 | 3.27 | 3.93 | 26.36 |
| 16 | 80 | 135.50 | 34.28 | 111.37 | 9.50 |
| 64 | 320 | 136.48 | 366.29 | 447.13 | 2.70 |

Aggregate throughput did not rise between 16 and 64 concurrent requests, and
time to first token at 64 grew to several minutes. The contract sets no
absolute performance threshold, so these are recorded measurements rather
than a pass against a target. Mean GPU utilization over the run was 93.75%.

## Failures before the passing run

Two earlier attempts on the same topology failed and are preserved.

1. One attempt completed every profile stage and then failed the resource
   observation gate. The launcher was changed to bind the InfiniBand verbs
   devices inside the contained runtime and to require NCCL's InfiniBand
   transport, so an unavailable transport is rejected instead of falling back
   to sockets.
2. The next attempt failed the history round trip with invalid JSON on its
   seventh endpoint call, before any profile stage. Its receipt did not keep
   enough detail to explain the failure. The only change that followed adds
   bounded failure diagnostics; requests, token limits and the pass predicate
   were left as frozen.

The passing run did not reproduce the second failure. Its root cause is
unknown, and one passing run does not show that it cannot recur.

## Limits

- The profile matches the engine's published benchmark in workload shape
  only. It uses a deterministic token-ID corpus rather than that benchmark's
  dataset and is not an official benchmark result.
- The 262,144- and 1,048,576-token tiers and video input were not tested.
- Marker retrieval was tested to 120,000 input tokens, not at the full
  131,072-token capacity tier.
- This was one time-bounded evaluation job. It says nothing about
  long-running stability, restart behavior or production readiness.
- The GLM-5.2 client in `client/` was not part of this run.

## Retained receipt identities

| Logical name | Bytes | SHA-256 |
| --- | ---: | --- |
| Acceptance receipt | 8,520 | `032000f4c5abb2cd03798da9886a28d38d1f3a09b383fc7f0035a7cd9915d354` |
| Cleanup receipt | 867 | `b527578d78d40e8aa4ccc7977defe6d971f4abaacbe18db2931f19b7fa149c52` |
| Launch manifest | 6,287 | `2a262cf93f14bbdf1b0237eac8c1f30bff4ea128c409202cece0f5f0e7075f40` |
| Completion audit | 16,291 | `46006a737bd3873a24d228a3e7d73956e454191957a40b65b0c2ceb942d26a2f` |
