import { promisify } from 'util'
import { chmod, copyFile, stat } from 'fs'
import { spawn } from 'child_process'

const chmodAsync = promisify(chmod)
const copyAsync = promisify(copyFile)
const sleep = promisify(setTimeout)
const statAsync = promisify(stat)

const IS_LAMBDA = !!process.env.AWS_LAMBDA_FUNCTION_NAME
const DISPLAY_NUMBER = '99'

export async function setupLambdaXvfb() {
  if (!IS_LAMBDA) {
    return null
  }

  process.env.LIBGL_DRIVERS_PATH = '/opt/lib/dri'
  process.env.DISPLAY = `:${DISPLAY_NUMBER}`

  if (await x11Alive()) {
    return
  }

  await Promise.all([
    copyBinary('/opt/bin/xkbcomp', '/tmp/xkbcomp'),
    copyBinary('/opt/bin/Xvfb', '/tmp/Xvfb')
  ])

  const xvfb = spawn('/tmp/Xvfb', [`:${DISPLAY_NUMBER}`, '-screen', '0', '1024x768x24', '-ac'], {
    stdio: 'ignore'
  })
  while (!(await x11Alive())) {
    await sleep(100)
  }
  if (xvfb.exitCode !== null) {
    throw new Error('xvfb exited early')
  }

  return
}

async function x11Alive() {
  try {
    const stat = await statAsync(`/tmp/.X11-unix/X${DISPLAY_NUMBER}`)
    return stat.isSocket()
  } catch {}
  return false
}

async function copyBinary(from: string, to: string) {
  try {
    await copyAsync(from, to)
    await chmodAsync(to, 0o755)
  } catch {}
}
