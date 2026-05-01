import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Starting test...');

try {
  const vite = await createServer({
    configFile: false,
    plugins: [react()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    server: { middlewareMode: true },
    appType: 'spa',
  });
  console.log('Vite server created successfully');
  await vite.close();
  console.log('Done!');
} catch (e) {
  console.error('ERROR:', e.message);
  console.error(e.stack);
}
