#!/usr/bin/env node
/* Edge Function-ийг deploy хийх файлын жагсаалт (JSON) гаргана.
   _shared/ модулиудыг функцийн дотор "_shared/x.ts" нэрээр оруулж, import замыг "../_shared/" → "./_shared/" болгоно;
   функцийн хавтас доторх "./x.ts" модулиудыг мөн нэмнэ.
   Хэрэглээ: node supabase/functions/_bundle.js <function-name>  → stdout JSON [{name, content}] */
const fs = require("fs"), path = require("path");
const root = __dirname;
const fn = process.argv[2];
if (!fn) { console.error("function name?"); process.exit(2); }
const files = [], seen = new Set();
const SHARED = /from\s+"\.\.?\/_shared\/([^"]+)"/g, LOCAL = /from\s+"\.\/([^"/]+\.ts)"/g;
function add(name, abs, inShared) {
  if (seen.has(name)) return; seen.add(name);
  let src = fs.readFileSync(abs, "utf8");
  for (const m of src.matchAll(SHARED)) add("_shared/" + m[1], path.join(root, "_shared", m[1]), true);
  if (inShared) for (const m of src.matchAll(LOCAL)) add("_shared/" + m[1], path.join(root, "_shared", m[1]), true);
  else for (const m of src.matchAll(LOCAL)) add(m[1], path.join(root, fn, m[1]), false);
  if (!inShared) src = src.replace(/from\s+"\.\.\/_shared\//g, 'from "./_shared/');
  files.push({ name, content: src });
}
add("index.ts", path.join(root, fn, "index.ts"), false);
process.stdout.write(JSON.stringify(files));
