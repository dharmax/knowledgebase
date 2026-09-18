import { describe, it, expect } from 'bun:test'
import run from './run.ts'

describe('Skill: get-weather', () => {
  it('parses city location correctly and returns formatted weather output', async () => {
    const logs: string[] = []
    const mockCtx = {
      sh: async (cmd: string) => {
        if (cmd.includes('wttr.in')) {
          return { stdout: 'London: ⛅ +15°C (humidity: 60%, wind: 10km/h)', stderr: '', exitCode: 0 }
        }
        return { stdout: '', stderr: '', exitCode: 0 }
      },
      cwd: process.cwd(),
      env: {},
      log: (msg: string) => logs.push(msg),
      args: "what's the weather in London?"
    }

    const res = await run(mockCtx)
    expect(res.success).toBe(true)
    expect(res.location).toBe('London')
    expect(res.weather).toContain('London')
  })

  it('handles auto IP location when no city is specified', async () => {
    const logs: string[] = []
    const mockCtx = {
      sh: async (cmd: string) => {
        return { stdout: 'Current City: ☀️ +25°C', stderr: '', exitCode: 0 }
      },
      cwd: process.cwd(),
      env: {},
      log: (msg: string) => logs.push(msg),
      args: "what's the weather?"
    }

    const res = await run(mockCtx)
    expect(res.success).toBe(true)
    expect(res.location).toBe('auto')
  })
})
