---
title: Service Adapter Pattern for IO and External APIs
description: Standardized adapter boundary isolating network, filesystem, and external AI providers behind clean, mockable interfaces.
target: universal
tags: [architecture, service-adapter, clean-code, testing, io]
---

# Service Adapter Pattern for IO and External APIs

## Core Philosophy
Never scatter raw `fetch()`, SDK singletons, or environment-dependent primitives across domain logic. Encapsulate all IO behind typed Service Adapters.

## Benefits
1. **Mockability**: Unit test suites run in $<5\text{ms}$ with zero network calls by swapping the adapter.
2. **Provider Agnosticism**: Switching from Ollama to OpenRouter or Anthropic only touches the adapter layer.
3. **Graceful Degradation**: Adapters handle timeouts, exponential backoff, and offline fallbacks cleanly.

## Pattern Structure
```typescript
export interface LLMProviderAdapter {
  id: string;
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}

export class UniversalGatewayAdapter implements LLMProviderAdapter {
  constructor(private readonly apiKey?: string, private readonly baseUrl: string = 'https://openrouter.ai/api/v1') {}

  async complete(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
    });
    const json = await res.json();
    return json.choices[0].message.content;
  }
}
```
