import { promisify } from 'util'
import { chmod, copyFile, stat } from 'fs'
import { spawn } from 'child_process'

const chmodAsync = promisify(chmod)
const copyAsync = promisify(copyFile)
const sleep = promisify(setTimeout)
const statAsync = promisify(stat)

export async function setupXvfb() {
  await Promise.all([
    copyBinary('/var/task/bin/xkbcomp', '/tmp/xkbcomp'),
    copyBinary('/var/task/bin/Xvfb', '/tmp/Xvfb')
  ])
  process.env.LIBGL_DRIVERS_PATH = '/var/task/lib/dri'
  const xvfb = spawn('/tmp/Xvfb', [':99', '-screen', '0', '1024x768x24', '-ac'], {
    stdio: 'ignore'
  })
  process.env.DISPLAY = ':99'

  while (true) {
    try {
      const stat = await statAsync('/tmp/.X11-unix/X99')
      if (stat.isSocket()) {
        break
      }
    } catch {}
    await sleep(100)
  }
  if (xvfb.exitCode !== null) {
    throw new Error('xvfb exited early')
  }

  return xvfb
}

async function copyBinary(from: string, to: string) {
  await copyAsync(from, to)
  await chmodAsync(to, 0o755)
}
