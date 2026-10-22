// Run the checked-out Pi runLoop with scripted model responses and real fixture tests.
// No model API or credentials. Does not modify the source checkout.
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const source = await readFile(join(repo, 'pi-agent-src/packages/agent/src/agent-loop.ts'), 'utf8');
const walkthrough = process.argv.includes('--walkthrough');
const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: join(repo, 'pi-agent-src'), encoding: 'utf8' }).stdout.trim();
const expected = '784653468c42387f607d41ed5ca533100e7eb2fe';
if (commit !== expected) throw new Error(`Source changed: ${commit}. Recheck excerpts before running.`);

function extract(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`Source boundary missing: ${start}`);
  return { code: stripTypeScriptTypes(source.slice(from, to), { mode: 'strip' }), line: source.slice(0, from).split('\n').length };
}
const loop = extract('async function runLoop(', '/**\n * Stream an assistant response');
const execute = extract('async function executePreparedToolCall(', 'async function finalizeExecutedToolCall(');
const tmp = join(repo, '.tmp/practical-demo');
await mkdir(tmp, { recursive: true });
const work = await mkdtemp(join(tmp, 'run-'));
await writeFile(join(work, 'sum.mjs'), 'export const sum = (a, b) => a - b;\n');
await writeFile(join(work, 'sum.test.mjs'), "import { sum } from './sum.mjs';\nif (sum(2, 3) !== 5) throw new Error('sum(2, 3): expected 5, got ' + sum(2, 3));\nconsole.log('PASS: sum(2, 3) = 5');\n");

const steps = [
  { name: 'read', arguments: { path: 'sum.mjs' } },
  { name: 'bash', arguments: { command: 'node sum.test.mjs' } },
  { name: 'edit', arguments: { path: 'sum.mjs', oldText: 'a - b', newText: 'a + b' } },
  { name: 'bash', arguments: { command: 'node sum.test.mjs' } },
  { text: '已修复 sum，测试通过。' },
];
const records = [];
const events = [];
const context = { messages: [{ role: 'user', content: '修复 sum 的加法错误，并运行测试。' }], tools: [], systemPrompt: '' };
let calls = 0;
let latestFailure = false;
let fixtureContent = 'export const sum = (a, b) => a - b;\n';
const sandbox = {
  createErrorToolResult: (text) => ({ content: [{ type: 'text', text }] }),
  streamAssistantResponse: async (ctx) => {
    const step = steps[calls++];
    if (!step) throw new Error('Unexpected extra model call');
    const seen = ctx.messages.map(m => m.role + (m.isError ? '(error)' : ''));
    const message = { role: 'assistant', stopReason: 'stop', content: step.name
      ? [{ type: 'toolCall', id: `call-${calls}`, name: step.name, arguments: step.arguments }]
      : [{ type: 'text', text: step.text }] };
    ctx.messages.push(message); // Same context update as upstream streamAssistantResponse.
    records.push({ modelCall: calls, seen, output: step });
    console.log(`\n模型请求 ${calls} [预设输出]，输入角色：${seen.join(', ')}`);
    console.log(step.name ? `  请求 ${step.name}: ${JSON.stringify(step.arguments)}` : `  ${step.text}`);
    return message;
  },
  executeToolCalls: async (_ctx, assistant, _config, signal, emit) => {
    const tc = assistant.content[0];
    const outcome = await sandbox.executePreparedToolCall({
      toolCall: tc, args: tc.arguments,
      tool: { execute: async () => {
        let text;
        if (tc.name === 'read') text = await readFile(join(work, 'sum.mjs'), 'utf8');
        else if (tc.name === 'edit') {
          if (!latestFailure) throw new Error('Expected failing test before edit');
          const old = await readFile(join(work, 'sum.mjs'), 'utf8');
          if (old.split(tc.arguments.oldText).length !== 2) throw new Error('Replacement must match once');
          fixtureContent = old.replace(tc.arguments.oldText, tc.arguments.newText);
          await writeFile(join(work, 'sum.mjs'), fixtureContent);
          text = 'Replaced a - b with a + b';
        } else if (tc.name === 'bash') {
          // Deliberately accepts one fixed command; this is a fixture adapter, not Pi's bash tool.
          if (tc.arguments.command !== 'node sum.test.mjs') throw new Error('Unsupported fixture command');
          const result = spawnSync(process.execPath, ['sum.test.mjs'], { cwd: work, encoding: 'utf8' });
          text = `${result.stdout}${result.stderr}`.trim();
          latestFailure = result.status !== 0;
          if (latestFailure) throw new Error(`exit ${result.status}: ${text}`);
        } else throw new Error('Unknown fixture tool');
        return { content: [{ type: 'text', text }] };
      } },
    }, signal, emit);
    const result = { role: 'toolResult', toolCallId: tc.id, toolName: tc.name, ...outcome.result, isError: outcome.isError };
    records.at(-1).result = result;
    const display = result.content.map(x => x.text).join('\n');
    console.log(`  真实工具结果 isError=${result.isError}: ${display.split('\n').slice(0, 5).join('\n')}`);
    return { messages: [result], terminate: false };
  },
  failToolCallsFromTruncatedMessage: async () => { throw new Error('Not part of this scenario'); },
};
vm.createContext(sandbox);
// Preserve original line numbers. V8 observes real execution without injecting trace statements.
const paddedSource = '\n'.repeat(loop.line - 1) + loop.code
  + '\n'.repeat(execute.line - loop.line - loop.code.split('\n').length + 1) + execute.code
  + '\nthis.runLoop = runLoop; this.executePreparedToolCall = executePreparedToolCall;';
const sourceUrl = 'pi-trace-agent-loop.ts';
const checkpoints = [
  { needle: 'const message = await streamAssistantResponse(currentContext', title: '调用模型', explanation: '即将把当前上下文交给模型。演示的模型响应预设，可以先看右侧消息再走下一步。' },
  { needle: 'const toolCalls = message.content.filter', title: '检查模型回复', explanation: '模型回复已加入历史。现在检查是否包含 toolCall；这里还没有执行本次工具。' },
  { needle: 'await emit({ type: "turn_end", message, toolResults });', title: '工具结果回到上下文', explanation: '有工具调用时，结果已追加到 messages。错误也会出现在这里，下一次模型调用将看到它。' },
  { needle: 'const result = await prepared.tool.execute(', title: '执行本地工具', explanation: '从这里进入工具适配器。read/edit/bash 使用教学实现；文件读写与 Node 测试是真实执行。' },
  { needle: 'result: createErrorToolResult(error instanceof Error ? error.message : String(error)),\n\t\t\tisError: true,\n\t\t};\n\t} finally', title: '异常被包装为工具结果', explanation: '测试进程失败，工具适配器抛出异常。Pi 的 catch 把异常包装为错误结果，而后返回循环。' },
  { needle: 'await emit({ type: "agent_end", messages: newMessages });\n}', title: '结束本次循环', explanation: '最后一轮没有工具调用，且没有待处理的后续消息，本次运行结束。结束本身不等于业务验收通过。' },
].map(point => {
  const offset = source.indexOf(point.needle);
  if (offset < 0) throw new Error(`Checkpoint missing: ${point.title}`);
  return { ...point, line: source.slice(0, offset).split('\n').length };
});
const pauses = [];
let debuggerSession;
let observerFailure;
if (walkthrough) {
  const { Session } = await import('node:inspector');
  debuggerSession = new Session();
  debuggerSession.connect();
  debuggerSession.post('Debugger.enable');
  for (const point of checkpoints) debuggerSession.post('Debugger.setBreakpointByUrl', { url: sourceUrl, lineNumber: point.line - 1 }, (error) => { if (error) observerFailure = error; });
  debuggerSession.on('Debugger.paused', ({ params }) => {
    try {
      const frame = params.callFrames[0];
      const line = frame.location.lineNumber + 1;
      const point = checkpoints.find(x => x.line === line);
      if (!point) throw new Error(`Unexpected breakpoint line ${line}`);
      const finalTurn = point.title === '工具结果回到上下文' && !records.at(-1)?.result;
      pauses.push({
        line, title: finalTurn ? '本轮收尾（没有工具调用）' : point.title,
        explanation: finalTurn ? '本轮模型返回文字，没有工具结果需要追加。循环接下来检查是否还有用户排队的消息。' : point.explanation,
        modelCall: point.title === '调用模型' ? calls + 1 : calls,
        messages: JSON.parse(JSON.stringify(context.messages)),
        lastRecord: records.length ? JSON.parse(JSON.stringify(records.at(-1))) : null,
        fixtureContent, latestFailure,
        stack: params.callFrames.filter(x => x.functionName === 'runLoop' || x.functionName === 'executePreparedToolCall').map(x => ({ function: x.functionName, line: x.location.lineNumber + 1 })),
      });
    } catch (error) { observerFailure = error; }
    finally { debuggerSession.post('Debugger.resume'); }
  });
}
vm.runInContext(paddedSource, sandbox, { filename: sourceUrl });
console.log(`Pi 源码循环演示\n源码 ${commit}\n原始 runLoop + executePreparedToolCall；模型与工具适配器预设，文件和测试真实执行。`);
try {
  await sandbox.runLoop(context, [], {}, undefined, async (event) => events.push(event.type), null);
} finally { debuggerSession?.disconnect(); }
if (observerFailure) throw observerFailure;
const roles = context.messages.map(x => x.role);
if (calls !== 5 || records[1].result.isError !== true || records[3].result.isError !== false || latestFailure || events.at(-1) !== 'agent_end') {
  throw new Error('Unexpected demo outcome');
}
const report = { sourceCommit: commit, model: 'scripted, no API', toolAdapter: 'fixture, not upstream built-ins', work, modelCalls: calls, roles, events, records, pauses };
await writeFile(join(work, 'trace.json'), JSON.stringify(report, null, 2));
if (walkthrough) {
  if (pauses.length !== 21 || pauses.filter(x => x.title === '异常被包装为工具结果').length !== 1
    || pauses.at(-1)?.title !== '结束本次循环' || pauses.at(-1).messages.length !== 10) {
    throw new Error(`Unexpected observed flow: ${pauses.length} checkpoints`);
  }
  const template = await readFile(join(here, 'walkthrough.template.html'), 'utf8');
  const browserData = JSON.stringify({ sourceCommit: commit, sourcePath: 'packages/agent/src/agent-loop.ts', source, pauses })
    .split(work).join('[临时目录]').replaceAll('<', '\\u003c');
  await mkdir(join(here, 'public'), { recursive: true });
  await writeFile(join(here, 'public/walkthrough.html'), template.replace('/*__TRACE_DATA__*/null', browserData));
  console.log(`代码跟读页已生成：${pauses.length} 个 V8 实际断点快照。http://localhost:3032/walkthrough.html`);
}
console.log(`\n验证通过：5 次模型请求，4 次工具执行，测试先失败再通过，最终 agent_end。\n完整证据：${join(work, 'trace.json')}`);
