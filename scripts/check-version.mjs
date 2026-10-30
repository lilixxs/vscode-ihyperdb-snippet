#!/usr/bin/env node
/**
 * 校验 Git 标签与 package.json 版本一致。
 * 用法：node scripts/check-version.mjs v0.1.0
 * 缺参数时读取环境变量 GITHUB_REF_NAME。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? '';

if (!tag) {
  console.error('缺少标签参数：node scripts/check-version.mjs v0.1.0');
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const expected = `v${version}`;

if (tag !== expected) {
  console.error(`标签 ${tag} 与 package.json 版本不一致，应为 ${expected}`);
  process.exit(1);
}

console.log(`标签与版本一致：${tag}`);
