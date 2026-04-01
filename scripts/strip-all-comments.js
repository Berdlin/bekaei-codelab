const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const exts = new Set(['.js', '.html', '.css']);

function stripJS(code) {
  let out = '';
  let i = 0;
  const len = code.length;
  let inS = false, inD = false, inT = false;
  let inLine = false, inBlock = false;
  let esc = false;
  while (i < len) {
    const ch = code[i];
    const next = code[i + 1];
    if (inBlock) {
      if (ch === '*' && next === '/') { inBlock = false; i += 2; continue; }
      i++; continue;
    }
    if (inLine) {
      if (ch === '\n') { inLine = false; out += ch; i++; continue; }
      i++; continue;
    }
    if (inS) {
      if (!esc && ch === "'") { inS = false; }
      esc = !esc && ch === '\\';
      out += ch; i++; continue;
    }
    if (inD) {
      if (!esc && ch === '"') { inD = false; }
      esc = !esc && ch === '\\';
      out += ch; i++; continue;
    }
    if (inT) {
      if (!esc && ch === '`') { inT = false; }
      esc = !esc && ch === '\\';
      out += ch; i++; continue;
    }


    if (ch === '/' && next === '*') { inBlock = true; i += 2; continue; }
    if (ch === '/' && next === '/') { inLine = true; i += 2; continue; }
    if (ch === "'") { inS = true; out += ch; i++; continue; }
    if (ch === '"') { inD = true; out += ch; i++; continue; }
    if (ch === '`') { inT = true; out += ch; i++; continue; }

    out += ch; i++;
  }
  return out;
}

function stripHTML(code) {

  return code.replace(/<!--[\s\S]*?-->/g, '');
}

function stripCSS(code) {

  return code.replace(/\/\*[\s\S]*?\*\
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      walk(full);
    } else {
      if (exts.has(path.extname(e.name).toLowerCase())) {
        try {
          const txt = fs.readFileSync(full, 'utf8');
          const ext = path.extname(e.name).toLowerCase();
          let stripped;
          if (ext === '.html') stripped = stripHTML(txt);
          else if (ext === '.css') stripped = stripCSS(txt);
          else stripped = stripJS(txt);

          if (stripped !== txt) {
            fs.writeFileSync(full, stripped, 'utf8');
            console.log('Processed:', full);
          } else {
            console.log('No comments found:', full);
          }
        } catch (err) {
          console.error('Failed:', full, err.message);
        }
      }
    }
  }
}

walk(root);
console.log('Done.');
