# Draft application bullets

- Designed and coordinated an AI-assisted A100/H100 LLM-serving workflow covering resource/topology trade-offs, native Anthropic/MCP integration, output-budget controls, long-context acceptance planning and evidence-bound validation.
- Reproduced a streaming false-completion defect and curated a narrowly repaired client candidate with 12/12 frozen synthetic cases and 6/6 compatibility cases, preserving negative evidence and separating offline validation from current service availability.
- Brought Kimi K3 up on four H100 nodes (32 GPUs, SGLang, native Anthropic Messages) and passed a frozen acceptance contract in one bounded run: 131,072-token total context served, 416 of 416 profile requests succeeded at concurrency 1, 16 and 64, InfiniBand RDMA transport confirmed in service logs, and cleanup verified; two earlier failed attempts are preserved.

These describe project-level responsibilities and AI-assisted implementation,
not sole manual authorship. The applicant can adjust personal-attribution
wording before use. The Kimi K3 figures are bounded by
[docs/kimi-k3-h100-acceptance.md](docs/kimi-k3-h100-acceptance.md); no
throughput target, GLM-5.2 throughput/context figure, personally owned GPU
capacity, current online service or submitted application is claimed.
