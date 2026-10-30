const assert = require('node:assert');
const vscode = require('vscode');

async function completionLabels(prefix) {
  const document = await vscode.workspace.openTextDocument({ language: 'c', content: prefix });
  const result = await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    document.uri,
    new vscode.Position(0, prefix.length),
  );
  const items = Array.isArray(result) ? result : result.items;
  return items.map((item) => (typeof item.label === 'string' ? item.label : item.label.label));
}

const CASES = [
  [
    'VS Code 能识别 c 语言',
    async () => {
      const document = await vscode.workspace.openTextDocument({ language: 'c', content: '' });
      assert.strictEqual(document.languageId, 'c');
    },
  ],
  [
    'ihdifelse 出现在 c 文件的补全列表',
    async () => {
      const labels = await completionLabels('ihdif');
      assert.ok(labels.includes('ihdifelse'), `实际补全项：${labels.slice(0, 40).join(', ')}`);
    },
  ],
  [
    'ihdTagWeekday 出现在 c 文件的补全列表',
    async () => {
      const labels = await completionLabels('ihdTagWeekday');
      assert.ok(labels.includes('ihdTagWeekday'), `实际补全项：${labels.slice(0, 40).join(', ')}`);
    },
  ],
  [
    'ihdBadVal 出现在 c 文件的补全列表',
    async () => {
      const labels = await completionLabels('ihdBadVal');
      assert.ok(labels.includes('ihdBadVal'), `实际补全项：${labels.slice(0, 40).join(', ')}`);
    },
  ],
];

exports.run = async function run() {
  const failures = [];

  for (const [name, execute] of CASES) {
    try {
      await execute();
      console.log(`ok - ${name}`);
    } catch (error) {
      failures.push(name);
      console.error(`not ok - ${name}\n${error.stack ?? error.message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`smoke 测试失败 ${failures.length} 项：${failures.join(' / ')}`);
  }
};
