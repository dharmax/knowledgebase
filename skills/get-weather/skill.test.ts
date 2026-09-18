import { describe, it, expect } from 'bun:test'
import run, { cleanLocationQuery } from './run.ts'

describe('Skill: get-weather', () => {
  it('cleans natural language weather sentences to pure location targets', () => {
    expect(cleanLocationQuery("what's the weather in London?")).toBe('London')
    expect(cleanLocationQuery("how is the weather in Tokyo?")).toBe('Tokyo')
    expect(cleanLocationQuery("what's the weather in africa?")).toBe('africa')
    expect(cleanLocationQuery("forecast for Paris")).toBe('Paris')
    expect(cleanLocationQuery("what's the weather?")).toBe('')
  })

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
    expect(res.text).toContain('London')
  })

  it('handles object args and cleans natural language input', async () => {
    const logs: string[] = []
    const mockCtx = {
      sh: async (cmd: string) => {
        if (cmd.includes('wttr.in')) {
          return { stdout: 'Tokyo: ☀️ +18°C (humidity: 50%, wind: 12km/h)', stderr: '', exitCode: 0 }
        }
        return { stdout: '', stderr: '', exitCode: 0 }
      },
      cwd: process.cwd(),
      env: {},
      log: (msg: string) => logs.push(msg),
      args: { input: "what's the weather in Tokyo?" }
    }

    const res = await run(mockCtx)
    expect(res.success).toBe(true)
    expect(res.location).toBe('Tokyo')
    expect(res.text).toContain('Tokyo')
  })

  it('detects macro-continents like Africa and queries regional meteorological hubs', async () => {
    const logs: string[] = []
    const queriedHubs: string[] = []
    const mockCtx = {
      sh: async (cmd: string) => {
        if (cmd.includes('wttr.in')) {
          const match = cmd.match(/wttr\.in\/([^?]+)/)
          const hub = match ? decodeURIComponent(match[1]) : 'Unknown'
          queriedHubs.push(hub)
          return { stdout: `${hub}: ☀️ +26°C (humidity: 50%, wind: 10km/h)`, stderr: '', exitCode: 0 }
        }
        return { stdout: '', stderr: '', exitCode: 0 }
      },
      cwd: process.cwd(),
      env: {},
      log: (msg: string) => logs.push(msg),
      args: { input: "what's the weather in africa?" }
    }

    const res = await run(mockCtx)
    expect(res.success).toBe(true)
    expect(res.isMacroRegion).toBe(true)
    expect(res.location).toBe('Africa')
    expect(queriedHubs).toContain('Cairo')
    expect(queriedHubs).toContain('Lagos')
    expect(queriedHubs).toContain('Nairobi')
    expect(queriedHubs).toContain('Johannesburg')
    expect(res.text).toContain('Africa Regional Weather Overview')
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
