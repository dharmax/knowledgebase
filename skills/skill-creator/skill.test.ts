import { describe, it, expect } from 'bun:test'
import run from './run.ts'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('Skill: skill-creator (Meta-Skill)', () => {
  it('scaffolds a complete valid skill directory and verifies it', async () => {
    const logs: string[] = []
    const mockCtx = {
      sh: async (cmd: string) => {
        // Mock bun test invocation to pass
        return { stdout: '1 pass\n0 fail', stderr: '', exitCode: 0 }
      },
      cwd: process.cwd(),
      env: {},
      log: (msg: string) => logs.push(msg),
      args: {
        name: 'test-audio-transcribe',
        description: 'Audio transcription using local whisper',
        tags: ['audio', 'whisper']
      }
    }

    const res = await run(mockCtx)
    expect(res.success).toBe(true)
    expect(res.skillId).toBe('skills/test-audio-transcribe')
    expect(fs.existsSync(path.join(res.path, 'skill.json'))).toBe(true)
    expect(fs.existsSync(path.join(res.path, 'run.ts'))).toBe(true)
    expect(fs.existsSync(path.join(res.path, 'skill.test.ts'))).toBe(true)

    // Cleanup test skill
    fs.rmSync(res.path, { recursive: true, force: true })
  })
})
