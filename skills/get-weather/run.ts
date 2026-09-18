export interface OSContext {
  sh: (cmd: string, opts?: any) => Promise<{ stdout: string; stderr: string; exitCode: number }>
  cwd: string
  env: Record<string, string>
  log: (msg: string) => void
  args: any
}

export default async function run(ctx: OSContext) {
  const { sh, log, args } = ctx

  let location = ''
  if (typeof args === 'string') {
    const clean = args
      .replace(/^(what('s|\s+is)\s+the\s+weather(\s+in|\s+for)?|how('s|\s+is)\s+the\s+weather(\s+in|\s+for)?|weather(\s+in|\s+for)?|get\s+weather(\s+in|\s+for)?|acquire\s+the\s+weather\s+skill)\s*/i, '')
      .replace(/[?!.]+$/, '')
      .trim()
    location = clean
  } else if (args && typeof args === 'object') {
    location = args.location || args.city || args.input || ''
  }

  const locParam = location ? encodeURIComponent(location) : ''
  log(`🌤️ Fetching weather report${location ? ` for "${location}"` : ' for current location'}...`)

  // Try wttr.in format 3 for clean terminal summary
  const res = await sh(`curl -s --max-time 6 "wttr.in/${locParam}?format=%l:+%c+%t+(humidity:+%h,+wind:+%w)"`)
  if (res.exitCode === 0 && res.stdout.trim() && !res.stdout.includes('<!DOCTYPE')) {
    const output = res.stdout.trim()
    log(`\x1b[1;36m${output}\x1b[0m`)
    return { success: true, location: location || 'auto', weather: output }
  }

  // Fallback to 1-day compact summary
  const fallback = await sh(`curl -s --max-time 6 "wttr.in/${locParam}?0"`)
  if (fallback.exitCode === 0 && fallback.stdout.trim()) {
    console.log('\n' + fallback.stdout)
    return { success: true, location: location || 'auto', weather: fallback.stdout }
  }

  throw new Error('Weather service unavailable or network timeout.')
}
