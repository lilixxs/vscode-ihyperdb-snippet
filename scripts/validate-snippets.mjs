#!/usr/bin/env node
/**
 * 校验片段库、清单与文档是否自洽。
 * 无第三方依赖，CI 与本地共用。
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNIPPET_FILE = path.join(ROOT, 'snippets', 'snippets.code-snippets');
const MANIFEST_FILE = path.join(ROOT, 'package.json');
const LOCK_FILE = path.join(ROOT, 'package-lock.json');
const README_FILE = path.join(ROOT, 'README.md');

/** 插件按设计只服务 C 语言模式，语言 ID 由 VS Code 内置 cpp 扩展声明。 */
const EXPECTED_LANGUAGE = 'c';
/** README 里已失效的旧手册地址。 */
const DEAD_DOC_URL = 'product.baosight.com/wp-content/uploads/doc/ihdonline';
const LIVE_DOC_HOST = 'res.baowugroup.com';

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function pass(message) {
  notes.push(`  ok  ${message}`);
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${path.basename(file)} 不是合法 JSON：${error.message}`);
    return null;
  }
}

/**
 * 解析 JSONC：去掉注释与尾逗号，字符串内容原样保留。
 * 片段描述里含 "/" 与 "}${...}"，不能用正则粗暴替换。
 */
function parseJsonc(text) {
  let out = '';
  let index = 0;
  let inString = false;
  let escaped = false;

  while (index < text.length) {
    const char = text[index];

    if (inString) {
      out += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      out += char;
      index += 1;
      continue;
    }

    if (char === '/' && text[index + 1] === '/') {
      while (index < text.length && text[index] !== '\n') index += 1;
      continue;
    }

    if (char === '/' && text[index + 1] === '*') {
      index += 2;
      while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) index += 1;
      index += 2;
      continue;
    }

    if (char === ',') {
      let lookahead = index + 1;
      while (lookahead < text.length && /\s/.test(text[lookahead])) lookahead += 1;
      if (text[lookahead] === ']' || text[lookahead] === '}') {
        index += 1;
        continue;
      }
    }

    out += char;
    index += 1;
  }

  return JSON.parse(out);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

function checkManifest() {
  const manifest = readJson(MANIFEST_FILE);
  if (!manifest) return null;

  const snippets = manifest?.contributes?.snippets;
  if (!Array.isArray(snippets) || snippets.length === 0) {
    fail('package.json 缺少 contributes.snippets');
    return manifest;
  }

  for (const entry of snippets) {
    if (entry.language !== EXPECTED_LANGUAGE) {
      fail(
        `contributes.snippets 的 language 必须是 "${EXPECTED_LANGUAGE}"，当前是 ${JSON.stringify(entry.language)}。` +
          'VS Code 按语言 ID 精确匹配，带引号或空值的 ID 不会挂载片段。',
      );
    } else {
      pass(`片段语言 ID = ${EXPECTED_LANGUAGE}`);
    }

    const target = path.resolve(ROOT, entry.path ?? '');
    if (!entry.path || !existsSync(target)) {
      fail(`contributes.snippets 指向的文件不存在：${entry.path}`);
    } else {
      pass(`片段文件存在：${entry.path}`);
    }
  }

  if (manifest.icon && !existsSync(path.resolve(ROOT, manifest.icon))) {
    fail(`icon 指向的文件不存在：${manifest.icon}`);
  }

  if (!/^\^\d+\.\d+\.\d+$/.test(manifest.engines?.vscode ?? '')) {
    fail(`engines.vscode 格式异常：${JSON.stringify(manifest.engines?.vscode)}`);
  }

  const lock = existsSync(LOCK_FILE) ? readJson(LOCK_FILE) : null;
  if (!lock) {
    fail('缺少 package-lock.json，CI 的 npm ci 会失败');
    return manifest;
  }

  const lockRoot = lock.version;
  const lockPackage = lock.packages?.['']?.version;
  if (lockRoot !== manifest.version || lockPackage !== manifest.version) {
    fail(
      `版本号不同步：package.json=${manifest.version}, package-lock.json=${lockRoot}, packages[""]=${lockPackage}`,
    );
  } else {
    pass(`版本号三处一致：${manifest.version}`);
  }

  return manifest;
}

function checkSnippets(readme) {
  let parsed;
  try {
    parsed = parseJsonc(readFileSync(SNIPPET_FILE, 'utf8'));
  } catch (error) {
    fail(`snippets.code-snippets 解析失败：${error.message}`);
    return;
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) {
    fail('片段文件为空');
    return;
  }
  pass(`片段数量：${entries.length}`);

  const seenPrefixes = new Map();

  for (const [key, value] of entries) {
    const label = `片段 "${key}"`;

    if (!/^ihd (syntax|func|snippet) \S+/.test(key)) {
      fail(`${label} 的键名不符合 "ihd syntax|func|snippet <名称>" 约定`);
    }

    const prefixes = asArray(value?.prefix);
    if (prefixes.length === 0 || prefixes.some((prefix) => typeof prefix !== 'string' || prefix.trim() === '')) {
      fail(`${label} 的 prefix 为空或不是字符串`);
    }

    for (const prefix of prefixes) {
      const normalized = String(prefix).toLowerCase();
      if (seenPrefixes.has(normalized)) {
        fail(`${label} 的 prefix "${prefix}" 与 "${seenPrefixes.get(normalized)}" 重复`);
      } else {
        seenPrefixes.set(normalized, key);
      }
    }

    const body = asArray(value?.body);
    if (body.length === 0 || body.some((line) => typeof line !== 'string')) {
      fail(`${label} 的 body 为空或含非字符串元素`);
      continue;
    }

    const indices = [...body.join('\n').matchAll(/\$\{(\d+):|\$(\d+)/g)].map((match) =>
      Number(match[1] ?? match[2]),
    );
    if (indices.length > 0) {
      const max = Math.max(...indices);
      const unique = new Set(indices);
      const missing = [];
      for (let index = 1; index <= max; index += 1) {
        if (!unique.has(index)) missing.push(index);
      }
      if (missing.length > 0) {
        fail(`${label} 的占位符编号不连续，缺少：${missing.join(', ')}`);
      }
    }

    if (key.startsWith('ihd func ')) {
      const fnName = body[0].match(/^([A-Za-z][A-Za-z0-9_]*)\(/)?.[1];
      const description = asArray(value?.description);
      if (fnName && description.length > 0) {
        const hasExample = description.some((line) =>
          new RegExp(`^${fnName}\\(`).test(String(line).trim()),
        );
        if (!hasExample) {
          fail(`${label} 的描述里缺少以 ${fnName}( 开头的示例行`);
        }
      }
    }

    if (readme) {
      const primary = prefixes[0];
      if (primary && !readme.includes(primary)) {
        fail(`${label} 的首个 prefix "${primary}" 没有出现在 README.md 的功能清单里`);
      }
    }
  }
}

function checkReadme() {
  if (!existsSync(README_FILE)) {
    fail('缺少 README.md');
    return null;
  }
  const readme = readFileSync(README_FILE, 'utf8');

  if (readme.includes(DEAD_DOC_URL)) {
    fail(`README.md 仍引用已失效的手册地址：${DEAD_DOC_URL}`);
  } else {
    pass('README.md 未引用失效手册地址');
  }

  if (!readme.includes(LIVE_DOC_HOST)) {
    fail(`README.md 未引用在线手册地址：${LIVE_DOC_HOST}`);
  } else {
    pass('README.md 引用了在线手册');
  }

  return readme;
}

checkManifest();
const readme = checkReadme();
checkSnippets(readme);

for (const line of notes) console.log(line);

if (failures.length > 0) {
  console.error('\n校验失败：');
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log('\n校验通过');
