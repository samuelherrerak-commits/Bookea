import { existsSync } from 'node:fs'
import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
Config.setPixelFormat('yuv420p')

// Remotion baja su propio Chromium de remotion.media, que este entorno no deja pasar;
// usamos el de Playwright si existe (o CHROMIUM_PATH).
const chromium = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'
if (existsSync(chromium)) Config.setBrowserExecutable(chromium)
