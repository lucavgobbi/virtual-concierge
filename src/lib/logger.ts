import { appendFile, mkdir } from 'fs/promises'
import { join } from 'path'

const LOG_DIR = join(process.cwd(), 'logs')
const ERROR_LOG = join(LOG_DIR, 'error.log')

let ensured = false

async function ensureLogDir(): Promise<void> {
  if (ensured) return
  try {
    await mkdir(LOG_DIR, { recursive: true })
    ensured = true
  } catch {
    // Directory already exists or can't be created — proceed anyway
  }
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}\n${err.stack || ''}`
  }
  return String(err)
}

export async function logError(context: string, error: unknown): Promise<void> {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] [${context}] ${formatError(error)}\n`

  console.error(line.trimEnd())

  try {
    await ensureLogDir()
    await appendFile(ERROR_LOG, line, 'utf-8')
  } catch {
    // Can't log the logging failure — nothing we can do
  }
}
