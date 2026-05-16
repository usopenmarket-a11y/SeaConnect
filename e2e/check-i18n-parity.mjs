/**
 * i18n key parity checker — Area 4C
 *
 * Reads web/messages/ar.json and web/messages/en.json, performs a deep key
 * comparison, and prints any keys that are present in one locale but missing
 * from the other.
 *
 * Usage:
 *   node e2e/check-i18n-parity.mjs
 *
 * Exit codes:
 *   0 — all keys are in parity
 *   1 — at least one key is missing from one of the locales
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MESSAGES_DIR = resolve(__dirname, '../web/messages')

// ---------------------------------------------------------------------------
// Load locale files
// ---------------------------------------------------------------------------

function loadJson(locale) {
  const filePath = resolve(MESSAGES_DIR, `${locale}.json`)
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (err) {
    console.error(`ERROR: Cannot read ${filePath}: ${err.message}`)
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Deep key traversal — returns flat dot-notation key list
// ---------------------------------------------------------------------------

function flatKeys(obj, prefix = '') {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatKeys(v, full))
    } else {
      keys.push(full)
    }
  }
  return keys
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const ar = loadJson('ar')
const en = loadJson('en')

const arKeys = new Set(flatKeys(ar))
const enKeys = new Set(flatKeys(en))

const missingFromEn = [...arKeys].filter((k) => !enKeys.has(k))
const missingFromAr = [...enKeys].filter((k) => !arKeys.has(k))

const totalAr = arKeys.size
const totalEn = enKeys.size

console.log('=== SeaConnect i18n Key Parity Report ===')
console.log(`ar.json: ${totalAr} keys`)
console.log(`en.json: ${totalEn} keys`)
console.log('')

if (missingFromEn.length === 0 && missingFromAr.length === 0) {
  console.log('PASS — All keys are in parity between ar.json and en.json.')
  process.exit(0)
}

let hasMissing = false

if (missingFromEn.length > 0) {
  hasMissing = true
  console.log(`MISSING FROM en.json (${missingFromEn.length} keys):`)
  missingFromEn.sort().forEach((k) => console.log(`  - ${k}`))
  console.log('')
}

if (missingFromAr.length > 0) {
  hasMissing = true
  console.log(`MISSING FROM ar.json (${missingFromAr.length} keys):`)
  missingFromAr.sort().forEach((k) => console.log(`  - ${k}`))
  console.log('')
}

if (hasMissing) {
  console.log('FAIL — Key parity check failed. Resolve missing keys before release.')
  process.exit(1)
}
