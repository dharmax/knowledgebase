import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export interface OSContext {
  sh: (cmd: string, opts?: any) => Promise<{ stdout: string; stderr: string; exitCode: number }>
  cwd: string
  env: Record<string, string>
  log: (msg: string) => void
  args: any
}

export default async function run(ctx: OSContext) {
  const { sh, log, args } = ctx

  let inputName = ''
  let inputDesc = ''
  let tags: string[] = ['custom', 'skill']

  if (typeof args === 'string') {
    const raw = args.replace(/^create\s+skill\s+/i, '').trim()
    inputName = raw.split(/\s+/)[0] || 'custom-skill'
    inputDesc = raw || 'Custom synthesized operational skill'
  } else if (args && typeof args === 'object') {
    inputName = args.name || args.input || 'custom-skill'
    inputDesc = args.description || args.prompt || `Skill for ${inputName}`
    if (Array.isArray(args.tags)) tags = args.tags
  }

  const safeName = inputName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'custom-skill'
  log(`🛠️ Scaffolding skill bundle for: "${safeName}"...`)

  // Target directory inside user's local skills cache
  const targetDir = path.join(os.homedir(), '.config', 'ai-cli', 'skills', safeName)
  fs.mkdirSync(targetDir, { recursive: true })

  // 1. Generate skill.json
  const meta = {
    id: `skills/${safeName}`,
    name: safeName,
    title: safeName.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    description: inputDesc,
    target: 'universal',
    tags: Array.from(new Set([safeName, ...tags])),
    safeToAutomate: true,
    requirements: {
      daemons: [],
      binaries: []
    },
    inputs: {
      query: { type: 'string', description: 'Input parameter for the skill' }
    },
    entrypoint: 'run.ts'
  }

  fs.writeFileSync(path.join(targetDir, 'skill.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8')
  log(`  ➜ Created skill.json`)

  // 2. Generate run.ts
  const runCode = `export interface OSContext {
  sh: (cmd: string, opts?: any) => Promise<{ stdout: string; stderr: string; exitCode: number }>
  cwd: string
  env: Record<string, string>
  log: (msg: string) => void
  args: any
}

export default async function run(ctx: OSContext) {
  const { log, args, sh } = ctx
  log(\`Running skill "${safeName}" with args: \${JSON.stringify(args)}\`)
  return { success: true, skill: "${safeName}", timestamp: new Date().toISOString() }
}
`
  fs.writeFileSync(path.join(targetDir, 'run.ts'), runCode, 'utf8')
  log(`  ➜ Created run.ts`)

  // 3. Generate skill.test.ts
  const testCode = `import { describe, it, expect } from 'bun:test'
import run from './run.ts'

describe('Skill: ${safeName}', () => {
  it('executes successfully and returns structured output', async () => {
    const logs: string[] = []
    const ctx = {
      sh: async () => ({ stdout: '', stderr: '', exitCode: 0 }),
      cwd: process.cwd(),
      env: {},
      log: (msg: string) => logs.push(msg),
      args: { test: true }
    }
    const res = await run(ctx)
    expect(res.success).toBe(true)
    expect(res.skill).toBe('${safeName}')
  })
})
`
  fs.writeFileSync(path.join(targetDir, 'skill.test.ts'), testCode, 'utf8')
  log(`  ➜ Created skill.test.ts`)

  // 4. Run verification test suite
  log(`🧪 Running deterministic verification test...`)
  const testRes = await sh(`bun test "${path.join(targetDir, 'skill.test.ts')}"`)
  if (testRes.exitCode !== 0) {
    log(`⚠️ Verification test failed:\n${testRes.stderr || testRes.stdout}`)
    throw new Error(`Generated skill test failed verification: ${testRes.stderr || testRes.stdout}`)
  }
  log(`✔ Skill "${safeName}" verified and tested successfully!`)

  return {
    success: true,
    skillId: meta.id,
    path: targetDir,
    meta,
    files: ['skill.json', 'run.ts', 'test.ts']
  }
}
