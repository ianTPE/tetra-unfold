#!/usr/bin/env node
// Claude Code 讀 .claude/skills，Codex 讀 .agents/skills。兩邊的內容要一樣，改完 skill 跑一次這個檢查
const fs = require('fs');
const path = require('path');

const roots = ['.agents/skills', '.claude/skills'].map(r => path.join(__dirname, r));
const list = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? list(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = root => list(root).map(f => path.relative(root, f).replace(/\\/g, '/')).sort();
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const problems = [];
const names = new Set(roots.flatMap(files));
for (const name of names) {
  const [a, b] = roots.map(r => path.join(r, name));
  if (!fs.existsSync(a) || !fs.existsSync(b)) problems.push(`Only in one folder: ${name}`);
  else if (read(a) !== read(b)) problems.push(`Different: ${name}`);
}
for (const name of names) {
  if (path.basename(name) !== 'SKILL.md' || !fs.existsSync(path.join(roots[0], name))) continue;
  const text = read(path.join(roots[0], name));
  const front = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const folder = path.dirname(name);
  if (!front) problems.push(`No frontmatter: ${name}`);
  else {
    if (!new RegExp(`^name: ${folder}$`, 'm').test(front[1])) problems.push(`name must be ${folder}: ${name}`);
    if (!/^description: \S/m.test(front[1])) problems.push(`No description: ${name}`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`ok: ${names.size} file(s) match`);
