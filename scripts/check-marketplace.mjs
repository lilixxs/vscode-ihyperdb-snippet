#!/usr/bin/env node
/**
 * 校验 Marketplace 上的最新版本。
 * 用法：node scripts/check-marketplace.mjs 0.1.1 [--wait 300]
 * 退出码 1 表示版本未上线。
 */
const EXTENSION_ID = 'lilixxs.vscode-ihyperdb-snippet';

const expected = process.argv[2];
const waitIndex = process.argv.indexOf('--wait');
const waitSeconds = waitIndex > -1 ? Number(process.argv[waitIndex + 1] ?? 300) : 300;

if (!expected) {
  console.error('用法：node scripts/check-marketplace.mjs <version> [--wait 秒数]');
  process.exit(1);
}

async function latestVersions() {
  const response = await fetch('https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json;api-version=7.2-preview.1',
      'User-Agent': 'vscode-ihyperdb-snippet-release-check',
    },
    body: JSON.stringify({
      filters: [{ criteria: [{ filterType: 7, value: EXTENSION_ID }], pageNumber: 1, pageSize: 1, sortBy: 0, sortOrder: 0 }],
      assetTypes: [],
      flags: 0x2 | 0x4 | 0x80,
    }),
  });

  if (!response.ok) throw new Error(`Marketplace 返回 ${response.status}`);
  const data = await response.json();
  const extension = data.results?.[0]?.extensions?.[0];
  if (!extension) throw new Error('Marketplace 未返回该扩展');
  return {
    latest: extension.versions?.[0]?.version ?? 'unknown',
    all: (extension.versions ?? []).map((item) => item.version),
  };
}

const deadline = Date.now() + waitSeconds * 1000;
let attempt = 0;
let last = { latest: 'unknown', all: [] };

for (;;) {
  attempt += 1;
  try {
    last = await latestVersions();
  } catch (error) {
    console.log(`第 ${attempt} 次查询失败：${error.message}`);
  }

  if (last.all.includes(expected)) {
    console.log(`Marketplace 已上线 ${expected}（当前最新 ${last.latest}）`);
    process.exit(0);
  }

  if (Date.now() >= deadline) break;
  console.log(`第 ${attempt} 次查询：期望 ${expected}，实际最新 ${last.latest}，15 秒后重试`);
  await new Promise((resolve) => setTimeout(resolve, 15000));
}

console.error(`Marketplace 未上线 ${expected}。当前版本：${last.all.join(', ') || '无'}`);
process.exit(1);
