// Mini-testhelper: elke geslaagde check print "ok …" (telt mee in run-all).
import assert from 'node:assert/strict'
export async function test(name, fn) {
  try { await fn(); console.log(`ok ${name}`) } catch (e) { console.error(`FAIL ${name}\n`, e); process.exitCode = 1 }
}
export { assert }
