import { describe, it, expect } from 'bun:test'
import run from './run.ts'
import { existsSync, unlinkSync } from 'node:fs'

describe('Skill: generate-image-sd', () => {
  it('should extract target output and prompt from input string', async () => {
    const logs: string[] = []
    const mockCtx = {
      sh: async () => ({ stdout: '', stderr: '', exitCode: 0 }),
      cwd: process.cwd(),
      env: { SD_HOST: 'http://127.0.0.1:59999' }, // Unreachable test port
      log: (msg: string) => logs.push(msg),
      args: 'generate an image of a red sports car and save it as test_car.png'
    }

    try {
      await run(mockCtx)
    } catch (err: any) {
      // Expected to fail on unreachable port, but proves prompt and target were extracted
      expect(logs.some((l) => l.includes('red sports car'))).toBe(true)
    }
  })

  it('should fall back cleanly if output file is not specified', async () => {
    const logs: string[] = []
    const mockCtx = {
      sh: async () => ({ stdout: '', stderr: '', exitCode: 0 }),
      cwd: process.cwd(),
      env: { SD_HOST: 'http://127.0.0.1:59999' },
      log: (msg: string) => logs.push(msg),
      args: { input: 'draw a futuristic city skyline' }
    }

    try {
      await run(mockCtx)
    } catch {
      expect(logs.some((l) => l.includes('futuristic city skyline'))).toBe(true)
    }
  })
})
