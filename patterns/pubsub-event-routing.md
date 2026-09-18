---
title: Decoupled Actor Communication via PubSub
description: Universal pattern for event-driven coordination between autonomous agents, CLI wrappers, and UI layers using @dharmax/pubsub.
target: universal
tags: [pubsub, events, architecture, clean-code, decoupling]
---

# Decoupled Actor Communication via PubSub

## Core Philosophy
Never couple long-running autonomous actors directly to UI rendering, CLI loggers, or downstream side-effects. Instead, emit typed semantic events over a centralized PubSub bus.

## Rules of Engagement
1. **Source Namespace Prefix**: Always namespace your topic (e.g. `aiwf`, `ai-cli`).
2. **Deterministic Payload Types**: Every event must carry a stable payload signature.
3. **No Direct Domestic Mutation**: Consumers should treat event payloads as read-only telemetry.

## Implementation Pattern
```typescript
import { pubsub } from '@dharmax/pubsub';

// 1. Publisher (e.g. Engine or Actor)
pubsub.trigger('aiwf', 'actor:step', {
  step: currentStep,
  action: 'tool_call',
  tool: toolName,
  timestamp: Date.now()
});

// 2. Subscriber (e.g. Terminal UI or Progress Bar)
pubsub.on('actor:step', (event) => {
  const { step, tool } = event.data;
  progress.update(`Step ${step}: Executing ${tool}...`);
});
```
