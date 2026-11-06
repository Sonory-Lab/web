'use strict';

const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('public/index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];

if (scripts.length < 2) {
  throw new Error('Se esperaban los scripts inline de selección de ruta y aplicación.');
}

for (let index = 0; index < scripts.length; index += 1) {
  new vm.Script(scripts[index][1], {
    filename: \`public/index.html:inline-script-\${index + 1}\`,
  });
}

if (!html.includes('id="publicExperience"') || !html.includes('id="adminExperience"')) {
  throw new Error('Falta una de las vistas integradas en el HTML.');
}
if (/<script[^>]+src=["']\/(?:app|admin)\.js/.test(html) ||
    /<link[^>]+href=["']\/(?:styles|admin)\.css/.test(html)) {
  throw new Error('El documento todavía carga CSS o JavaScript frontend por separado.');
}

console.log(\`HTML unificado correcto: \${scripts.length} scripts inline.\`);
