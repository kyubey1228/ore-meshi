import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const server = '.next/standalone/server.js';
if (!existsSync(server)) throw new Error('Run npm run build before E2E_PRODUCTION=true tests.');
// Next.js standalone deployment needs public and generated client assets alongside server.js.
cpSync('public', '.next/standalone/public', { recursive: true });
cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
const child = spawn(process.execPath, [server], { stdio: 'inherit', env: process.env });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
