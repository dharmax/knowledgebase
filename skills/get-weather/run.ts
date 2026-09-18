export interface OSContext {
  sh: (cmd: string, opts?: any) => Promise<{ stdout: string; stderr: string; exitCode: number }>
  cwd: string
  env: Record<string, string>
  log: (msg: string) => void
  args: any
}

export function cleanLocationQuery(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/^(what('s|\s+is)\s+the\s+weather(\s+in|\s+for|\s+at)?|how('s|\s+is)\s+the\s+weather(\s+in|\s+for|\s+at)?|weather(\s+in|\s+for|\s+at)?|get\s+weather(\s+in|\s+for|\s+at)?|forecast(\s+in|\s+for|\s+at)?|check\s+the\s+weather(\s+in|\s+for|\s+at)?|acquire\s+the\s+weather\s+skill)\s*/i, '')
    .replace(/[?!.]+$/, '')
    .trim()
}

export const MACRO_REGIONS: Record<string, { label: string; hubs: Array<{ name: string; region: string }> }> = {
  africa: {
    label: 'Africa',
    hubs: [
      { name: 'Cairo', region: 'Northern Africa' },
      { name: 'Lagos', region: 'Western Africa' },
      { name: 'Nairobi', region: 'Eastern Africa' },
      { name: 'Johannesburg', region: 'Southern Africa' }
    ]
  },
  europe: {
    label: 'Europe',
    hubs: [
      { name: 'London', region: 'Western Europe' },
      { name: 'Berlin', region: 'Central Europe' },
      { name: 'Rome', region: 'Southern Europe' },
      { name: 'Warsaw', region: 'Eastern Europe' }
    ]
  },
  asia: {
    label: 'Asia',
    hubs: [
      { name: 'Tokyo', region: 'East Asia' },
      { name: 'Singapore', region: 'Southeast Asia' },
      { name: 'Mumbai', region: 'South Asia' },
      { name: 'Dubai', region: 'Western Asia' }
    ]
  },
  'north america': {
    label: 'North America',
    hubs: [
      { name: 'New York', region: 'Eastern US' },
      { name: 'Chicago', region: 'Midwest US' },
      { name: 'Los Angeles', region: 'Western US' },
      { name: 'Toronto', region: 'Eastern Canada' }
    ]
  },
  'south america': {
    label: 'South America',
    hubs: [
      { name: 'Sao Paulo', region: 'Brazil' },
      { name: 'Buenos Aires', region: 'Argentina' },
      { name: 'Bogota', region: 'Colombia' },
      { name: 'Santiago', region: 'Chile' }
    ]
  },
  oceania: {
    label: 'Oceania',
    hubs: [
      { name: 'Sydney', region: 'Eastern Australia' },
      { name: 'Perth', region: 'Western Australia' },
      { name: 'Auckland', region: 'New Zealand' }
    ]
  }
}

export default async function run(ctx: OSContext) {
  const { sh, log, args } = ctx

  // 1. Argument Extraction & Normalization
  let rawLocation = ''
  if (typeof args === 'string') {
    rawLocation = cleanLocationQuery(args)
  } else if (args && typeof args === 'object') {
    const candidate = args.location || args.city || args.input || args.prompt || ''
    rawLocation = cleanLocationQuery(String(candidate))
  }

  const normalizedKey = rawLocation.toLowerCase().trim()

  // 2. Planning: Check for Macro-Region / Continent Query
  const macro = MACRO_REGIONS[normalizedKey]
  if (macro) {
    log(`🌍 "${macro.label}" is a continent spanning multiple climate zones. Querying regional meteorological hubs...`)

    const reports: string[] = []
    const results = await Promise.all(
      macro.hubs.map(async (hub) => {
        try {
          const res = await sh(`curl -s --max-time 6 "wttr.in/${encodeURIComponent(hub.name)}?format=%l:+%c+%t+(humidity:+%h,+wind:+%w)"`)
          if (res.exitCode === 0 && res.stdout.trim() && !res.stdout.includes('<!DOCTYPE') && !res.stdout.includes('Unknown location')) {
            return `  • \x1b[1m${hub.region} (${hub.name})\x1b[0m: ${res.stdout.trim()}`
          }
        } catch {}
        return `  • \x1b[1m${hub.region} (${hub.name})\x1b[0m: Service temporarily unavailable`
      })
    )

    const header = `\x1b[1;36m🌍 ${macro.label} Regional Weather Overview:\x1b[0m`
    const body = results.join('\n')
    const fullText = `${header}\n${body}`

    log('\n' + fullText)
    return {
      success: true,
      location: macro.label,
      isMacroRegion: true,
      text: fullText
    }
  }

  // 3. Planning: Single Location or Local IP Weather Query
  const locParam = rawLocation ? encodeURIComponent(rawLocation) : ''
  const displayTarget = rawLocation || 'current location'
  log(`🌤️ Fetching weather report for "${displayTarget}"...`)

  // Try wttr.in format 3 for clean terminal summary
  const res = await sh(`curl -s --max-time 6 "wttr.in/${locParam}?format=%l:+%c+%t+(humidity:+%h,+wind:+%w)"`)
  if (res.exitCode === 0 && res.stdout.trim() && !res.stdout.includes('<!DOCTYPE') && !res.stdout.includes('Unknown location')) {
    const output = res.stdout.trim()
    log(`\x1b[1;36m${output}\x1b[0m`)
    return {
      success: true,
      location: rawLocation || 'auto',
      text: output
    }
  }

  // Fallback to 1-day compact ASCII summary
  const fallback = await sh(`curl -s --max-time 6 "wttr.in/${locParam}?0"`)
  if (fallback.exitCode === 0 && fallback.stdout.trim() && !fallback.stdout.includes('<!DOCTYPE') && !fallback.stdout.includes('Unknown location')) {
    log('\n' + fallback.stdout)
    return {
      success: true,
      location: rawLocation || 'auto',
      text: fallback.stdout
    }
  }

  throw new Error(`Weather service unavailable or unknown location "${displayTarget}".`)
}
