import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

export function readJson<T>(filename: string, defaultValue: T): T {
  ensureDataDir()
  const fp = path.join(DATA_DIR, filename)
  try {
    if (!fs.existsSync(fp)) return defaultValue
    return JSON.parse(fs.readFileSync(fp, 'utf-8'))
  } catch {
    return defaultValue
  }
}

export function writeJson<T>(filename: string, data: T): void {
  ensureDataDir()
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8')
}

export function readText(filename: string): string | null {
  ensureDataDir()
  const fp = path.join(DATA_DIR, filename)
  try {
    if (!fs.existsSync(fp)) return null
    return fs.readFileSync(fp, 'utf-8')
  } catch {
    return null
  }
}

export function writeText(filename: string, content: string): void {
  ensureDataDir()
  fs.writeFileSync(path.join(DATA_DIR, filename), content, 'utf-8')
}
