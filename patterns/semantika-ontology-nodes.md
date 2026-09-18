---
title: Semantika AST+ Semantic Ontology Design
description: Rules for defining typed graph entities, bidirectional predicates, and localId resolution with SQLite persistence.
target: aiwf
tags: [semantika, graph, ontology, sqlite, ast]
---

# Semantika AST+ Semantic Ontology Design

## Core Philosophy
A codebase is a living semantic graph, not just flat text files. Entities (Tickets, Modules, Files, Symbols) have distinct lifecycles and relationships (depends_on, imports, references).

## Key Principles
1. **DCR Registration**: Every entity class must define a static `dcr` (Descriptor) defining its schema and table mappings.
2. **Deterministic Qualified IDs**:
   - Files: `file:<relativePath>`
   - Symbols: `sym:<filePath>#<symbolName>`
   - Tickets: `tkt:<ticketId>`
3. **Local ID Projection**: Always use `store.localId(entity.id)` when presenting IDs in Kanban boards or CLI views.

## Example
```typescript
import { EntityDcr, AbstractEntity } from '@dharmax/semantika';

export class FileNode extends AbstractEntity {
  static readonly dcr = new EntityDcr({
    name: 'FileNode',
    tableName: 'files',
    fields: {
      path: { type: 'string', indexed: true },
      size: { type: 'number' },
      lastModified: { type: 'number' }
    }
  });
}
```
