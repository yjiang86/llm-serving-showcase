# Dependencies and licensing metadata

The existing dependency lockfile is preserved. Direct dependencies are:

| Package | Pinned version | License recorded in lockfile |
| --- | --- | --- |
| @modelcontextprotocol/sdk | 1.29.0 | MIT |
| zod | 4.4.3 | MIT |

The lockfile also records transitive MIT, ISC, BSD-2-Clause and BSD-3-Clause
licenses; the root package has no license metadata. Dependency source and
runtime binaries are not included. Upstream terms remain associated with
those dependencies. No repository-level open-source license is added.

The package remains `private: true`. Its start script selects the native
Anthropic candidate included in this snapshot; dependency versions and
integrities are unchanged. Node.js 20 or later is required.

The project sample does not contain model weights, containers or datasets.
Licenses for any separately acquired model and runtime remain separate.
