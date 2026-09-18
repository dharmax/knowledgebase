import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const isObject = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (isObject(value)) {
    return '{' + Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value) ?? 'null';
}

export function computeHash(value: unknown): string {
  const serialized = typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : canonical(value);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

export interface KnowledgeItemMeta {
  id: string;
  type: 'service' | 'skill' | 'pattern';
  title: string;
  description: string;
  target: 'universal' | 'ai-cli' | 'aiwf';
  tags: string[];
  path: string;
  sha256: string;
  sizeBytes: number;
}

export interface KnowledgeManifest {
  version: '1.0.0';
  generatedAt: string;
  repo: 'dharmax/knowledgebase';
  totalItems: number;
  items: KnowledgeItemMeta[];
}

function parseMarkdownFrontmatter(content: string): { meta: Record<string, any>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const rawYaml = match[1];
  const meta: Record<string, any> = {};
  for (const line of rawYaml.split('\n')) {
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (kv) {
      let val: any = kv[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^['"]|['"]$/g, ''));
      }
      meta[kv[1]] = val;
    }
  }
  return { meta, body: match[2] };
}

function buildManifest(root: string): KnowledgeManifest {
  const items: KnowledgeItemMeta[] = [];

  // 1. Scan services/
  const servicesDir = path.join(root, 'services');
  if (fs.existsSync(servicesDir)) {
    for (const f of fs.readdirSync(servicesDir)) {
      if (!f.endsWith('.yaml') && !f.endsWith('.yml') && !f.endsWith('.json')) continue;
      const fullPath = path.join(servicesDir, f);
      const content = fs.readFileSync(fullPath, 'utf8');
      const sha256 = computeHash(content);
      const stat = fs.statSync(fullPath);
      const baseName = f.replace(/\.[^.]+$/, '');
      const id = `services/${baseName}`;

      let title = baseName.replace(/-/g, ' ');
      let description = `Service recipe for ${baseName}`;
      let target: 'universal' | 'ai-cli' | 'aiwf' = 'ai-cli';
      let tags = [baseName, 'service', 'linux'];

      if (f.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.title) title = parsed.title;
          if (parsed.description) description = parsed.description;
          if (parsed.tags) tags = parsed.tags;
          if (parsed.target) target = parsed.target;
        } catch {}
      }

      items.push({
        id,
        type: 'service',
        title,
        description,
        target,
        tags,
        path: `services/${f}`,
        sha256,
        sizeBytes: stat.size
      });
    }
  }

  // 2. Scan skills/
  const skillsDir = path.join(root, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const f of fs.readdirSync(skillsDir)) {
      if (!f.endsWith('.json') && !f.endsWith('.yaml')) continue;
      const fullPath = path.join(skillsDir, f);
      const content = fs.readFileSync(fullPath, 'utf8');
      const stat = fs.statSync(fullPath);
      const baseName = f.replace(/\.[^.]+$/, '');
      const id = `skills/${baseName}`;

      let title = baseName.replace(/-/g, ' ');
      let description = `Skill procedure for ${baseName}`;
      let target: 'universal' | 'ai-cli' | 'aiwf' = 'universal';
      let tags = [baseName, 'skill'];
      let sha256 = computeHash(content);

      if (f.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.title) title = parsed.title;
          if (parsed.description) description = parsed.description;
          if (parsed.tags) tags = parsed.tags;
          if (parsed.target) target = parsed.target;
          sha256 = computeHash(parsed);
        } catch {}
      }

      items.push({
        id,
        type: 'skill',
        title,
        description,
        target,
        tags,
        path: `skills/${f}`,
        sha256,
        sizeBytes: stat.size
      });
    }
  }

  // 3. Scan patterns/
  const patternsDir = path.join(root, 'patterns');
  if (fs.existsSync(patternsDir)) {
    for (const f of fs.readdirSync(patternsDir)) {
      if (!f.endsWith('.md')) continue;
      const fullPath = path.join(patternsDir, f);
      const content = fs.readFileSync(fullPath, 'utf8');
      const stat = fs.statSync(fullPath);
      const baseName = f.replace(/\.md$/, '');
      const id = `patterns/${baseName}`;
      const { meta, body } = parseMarkdownFrontmatter(content);

      const title = meta.title || baseName.replace(/-/g, ' ');
      const description = meta.description || `Architecture pattern for ${baseName}`;
      const target = meta.target || 'aiwf';
      const tags = Array.isArray(meta.tags) ? meta.tags : [baseName, 'pattern', 'architecture'];
      const sha256 = computeHash(content);

      items.push({
        id,
        type: 'pattern',
        title,
        description,
        target,
        tags,
        path: `patterns/${f}`,
        sha256,
        sizeBytes: stat.size
      });
    }
  }

  // Sort items deterministically by ID
  items.sort((a, b) => a.id.localeCompare(b.id));

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    repo: 'dharmax/knowledgebase',
    totalItems: items.length,
    items
  };
}

// Execute build if run as script
const root = path.resolve(process.argv[2] || '.');
const manifest = buildManifest(root);
const manifestPath = path.join(root, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`✅ Generated manifest.json with ${manifest.totalItems} content-addressed item(s).`);
