export interface OSContext {
  sh: (cmd: string, opts?: any) => Promise<{ stdout: string; stderr: string; exitCode: number }>
  cwd: string
  env: Record<string, string>
  log: (msg: string) => void
  args: any
}

export default async function run(ctx: OSContext) {
  const { env, log, args } = ctx
  const host = env.SD_HOST || 'http://lotus:7860'

  let fullInput = ''
  if (typeof args === 'string') fullInput = args
  else if (args && typeof args.input === 'string') fullInput = args.input
  else if (args && typeof args.prompt === 'string') fullInput = args.prompt
  else if (args && Array.isArray(args.positional)) fullInput = args.positional.join(' ')
  else if (Array.isArray(args)) fullInput = args.join(' ')
  fullInput = fullInput.trim()

  // Extract file target if specified
  const fileMatch =
    fullInput.match(/(?:save(?:\s+it)?\s+as\s+|into\s+|to\s+)([a-zA-Z0-9_.-]+\.(?:png|jpg|jpeg))/i) ||
    fullInput.match(/([a-zA-Z0-9_.-]+\.(?:png|jpg|jpeg))/i)
  const outFile = fileMatch ? fileMatch[1] : (args?.output || 'output.png')

  // Clean prompt of directives
  const cleanPrompt =
    fullInput
      .replace(/generate\s+(an?\s+)?(image|picture|pic|photo)\s+of\s+/i, '')
      .replace(/(?:save(?:\s+it)?\s+as\s+|into\s+|to\s+)[a-zA-Z0-9_.-]+\.(?:png|jpg|jpeg)/i, '')
      .trim() || 'a majestic cat, photorealistic, 8k, detailed'

  log(`🎨 Generating image via ${host} [SDXL] for: "${cleanPrompt}"...`)

  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 90000)
    const res = await fetch(`${host}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: cleanPrompt,
        steps: 25,
        width: 1024,
        height: 1024
      }),
      signal: ctrl.signal
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const json = (await res.json()) as { images?: string[] }
    if (!json.images || !json.images[0]) throw new Error('No image data returned from Stable Diffusion')

    await Bun.write(outFile, Buffer.from(json.images[0], 'base64'))
    log(`✔ Successfully saved generated image to: ${outFile}`)

    const isKittyOrGhostty = Boolean(
      process.env.KITTY_WINDOW_ID ||
        (process.env.TERM || '').includes('kitty') ||
        (process.env.TERM_PROGRAM || '').toLowerCase().includes('ghostty')
    )
    if (isKittyOrGhostty) {
      const b64 = json.images[0]
      const chunkSize = 4096
      for (let i = 0; i < b64.length; i += chunkSize) {
        const chunk = b64.slice(i, i + chunkSize)
        const isLast = i + chunkSize >= b64.length
        const m = isLast ? 0 : 1
        const header = i === 0 ? 'a=T,f=100,t=d,' : ''
        process.stdout.write(`\x1b_G${header}m=${m};${chunk}\x1b\\`)
      }
      process.stdout.write('\n')
    }

    return { success: true, outFile, prompt: cleanPrompt }
  } catch (err: any) {
    log(`❌ Image generation failed: ${err.message}`)
    throw err
  }
}
