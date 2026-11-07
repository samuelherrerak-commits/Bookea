import { existsSync, readdirSync } from 'node:fs'
import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setJpegQuality(92)
Config.setOverwriteOutput(true)
Config.setPixelFormat('yuv420p')

// Remotion baja su propio Chromium de remotion.media, que este entorno no deja pasar:
// usamos el headless_shell de Playwright (o CHROMIUM_PATH).
const base = '/opt/pw-browsers'
const playwright = existsSync(base)
  ? readdirSync(base).filter((d) => d.startsWith('chromium_headless_shell-')).map((d) => `${base}/${d}/chrome-linux/headless_shell`).find(existsSync)
  : undefined
const chromium = process.env.CHROMIUM_PATH || playwright
if (chromium && existsSync(chromium)) Config.setBrowserExecutable(chromium)
