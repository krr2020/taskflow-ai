---
name: devops
description: Create reliable, production-grade infrastructure configurations. Use when working with Docker, Kubernetes, CI/CD, environment variables, or deployment pipelines. Generates safe, reproducible configurations that follow infrastructure-as-code principles.
---

## Design Thinking

Before changing any configuration, understand the context and commit to a SAFE operational direction:

- **Impact**: What services depend on this? What breaks if this fails? A port change might break ten services. A secret rotation might lock out the entire team. Map the blast radius before touching anything.
- **Rollback**: How do you undo this change at 3 AM under pressure? If the answer is "it's complicated" or "I'm not sure," you're not ready to make the change. Every infrastructure change needs an exit strategy.
- **Reproducibility**: Can you rebuild this from configuration alone? If something exists only in a running container, or requires "that one manual step," it will be lost. Encode everything.
- **Secrets**: Where do credentials live? Who can access them? Are they encrypted at rest? A leaked database password doesn't just break your app—it compromises user data.

**CRITICAL**: Choose a clear operational strategy and execute it with precision. Simple Docker Compose and complex Kubernetes manifests both work—the key is reproducibility, not sophistication. Test locally. Verify rollback. Document nothing you can encode.

## Execution Guidelines

Implement production-grade, functional infrastructure code that is safe and operationally sound.

**Failure Design**: Everything fails. Containers crash, networks partition, disks fill, certificates expire. Design for graceful degradation. Health checks, restart policies, circuit breakers, and resource limits are not optional—they're how systems survive reality.

**Configuration Hygiene**: No hardcoded values that vary between environments. No magic numbers without named constants. No secrets in committed files. Everything configurable should be configured through environment variables or mounted secrets.

**Dependency Ordering**: Services start before their dependencies are ready. Databases aren't available instantly. External APIs might be down. Use readiness probes, retry logic, and proper dependency declarations. Race conditions in startup cause the hardest bugs to diagnose.

**Incremental Changes**: Big-bang deployments are gambling. Prefer small, reversible changes that can be validated independently. Deploy one service at a time. Roll back at first sign of trouble. Speed comes from confidence, confidence comes from small proven steps.

## What NOT To Do

Avoid generic infrastructure patterns that cause production incidents:

- Manual changes to running systems without updating source configuration
- Missing health checks (Kubernetes will route to crashed containers)
- Hardcoded hostnames, IP addresses, or paths that assume specific environments
- Optimistic dependency assumptions (starting before dependencies are ready)
- Secrets committed to version control, even "temporarily"
- Configuration that only works with "that one manual step"
- Missing resource limits that allow runaway processes
