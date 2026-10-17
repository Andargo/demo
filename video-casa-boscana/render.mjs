// Renderiza index.html cuadro por cuadro y lo codifica a MP4 con ffmpeg.
// Uso: node render.mjs [fps] [salida.mp4]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const fps = Number(process.argv[2] || 30);
const out = process.argv[3] || path.join(dir, 'casa-boscana-reel.mp4');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(dir, 'index.html')).href + '?render');
await page.evaluate(() => document.fonts.ready);
await page.waitForLoadState('networkidle');
const duration = await page.evaluate(() => window.DURATION);
const frames = Math.round(duration * fps);

const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '18', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'ignore', 'inherit'] });

for (let i = 0; i < frames; i++) {
  await page.evaluate(t => window.seek(t), i / fps);
  ff.stdin.write(await page.screenshot({ type: 'jpeg', quality: 92 }));
  if (i % fps === 0) process.stdout.write(`\r${i}/${frames}`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log(`\nListo: ${out}`);
