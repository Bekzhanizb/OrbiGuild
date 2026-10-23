import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const ignored = new Set(['.git', 'node_modules', 'dist', 'coverage']);

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (ignored.has(entry.name)) return [];
    if (entry.isDirectory()) return markdownFiles(target);
    return entry.isFile() && entry.name.endsWith('.md') ? [target] : [];
  }));
  return files.flat();
}

function withoutFences(markdown) {
  return markdown.replace(/^\s*```[^\n]*\n[\s\S]*?^\s*```\s*$/gm, '');
}

function anchors(markdown) {
  const counts = new Map();
  const found = new Set();
  for (const heading of withoutFences(markdown).matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const slug = heading[1].toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
    const count = counts.get(slug) ?? 0;
    counts.set(slug, count + 1);
    found.add(count === 0 ? slug : `${slug}-${count}`);
  }
  return found;
}

const files = await markdownFiles(root);
const failures = [];
let checked = 0;
for (const file of files) {
  const source = await readFile(file, 'utf8');
  const lines = source.split('\n');
  let fenceOpen = false;
  for (const [index, line] of lines.entries()) {
    if (/^\s*```/.test(line)) {
      if (!fenceOpen && !/^\s*```\S+/.test(line)) {
        failures.push(`${path.relative(root, file)}:${index + 1}: Code fence needs a language.`);
      }
      fenceOpen = !fenceOpen;
    }
    if (/[\t ]+$/.test(line)) failures.push(`${path.relative(root, file)}:${index + 1}: Trailing whitespace.`);
  }
  if (fenceOpen) failures.push(`${path.relative(root, file)}: Unclosed code fence.`);
  if (!source.endsWith('\n')) failures.push(`${path.relative(root, file)}: Missing final newline.`);
  const markdown = withoutFences(source);
  if ([...markdown.matchAll(/^# /gm)].length !== 1) {
    failures.push(`${path.relative(root, file)}: Expected exactly one level-one heading.`);
  }
  // Repository docs use inline Markdown links. Remote URLs are deliberately
  // excluded: local onboarding must not depend on remote availability.
  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const link = match[1];
    if (/^[a-z][a-z\d+.-]*:/i.test(link)) continue;
    checked++;
    try {
      const [relative = '', fragment] = decodeURIComponent(link).split('#');
      const target = relative ? path.resolve(path.dirname(file), relative) : file;
      if (!target.startsWith(root)) throw new Error('Link leaves the repository.');
      const info = await stat(target);
      if (fragment && (!info.isFile() || !anchors(await readFile(target, 'utf8')).has(fragment))) {
        throw new Error('Heading anchor not found.');
      }
    } catch (error) {
      failures.push(`${path.relative(root, file)}: ${link} (${error instanceof Error ? error.message : 'invalid link'})`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.info(`Checked basic Markdown structure and ${checked} local links in ${files.length} files. Remote links were not checked.`);
}
