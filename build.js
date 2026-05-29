const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: ['src/ui/main.ts'],
  bundle: true,
  outfile: 'public/bundle.js',
  platform: 'browser',
  target: 'es2020',
});
