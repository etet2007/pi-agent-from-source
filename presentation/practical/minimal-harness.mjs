// A small client-tool harness using Anthropic Messages wire format.
// Default: scripted transport. --live: real API, using explicitly provided environment.
import { readFile } from 'node:fs/promises';
const live = process.argv.includes('--live');
const messages = [{ role: 'user', content: '读取 sum.mjs，告诉我加法实现有什么问题。' }];
const tools = [{ name: 'read', description: '读取示例 sum.mjs 文件', input_schema: {
  type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false,
} }];
let requests = 0;
async function callModel(body) {
  console.log(`\nREQUEST ${++requests}: ${JSON.stringify(body, null, 2)}`);
  if (!live) {
    // Only the transport is mocked. The same loop processes both modes.
    const response = requests === 1
      ? { role: 'assistant', content: [{ type: 'tool_use', id: 'call_1', name: 'read', input: { path: 'sum.mjs' } }], stop_reason: 'tool_use' }
      : { role: 'assistant', content: [{ type: 'text', text: 'sum 使用了减法。应把 a - b 改为 a + b。' }], stop_reason: 'end_turn' };
    console.log(`RESPONSE [预设]: ${JSON.stringify(response, null, 2)}`);
    return response;
  }
  if (!process.env.ANTHROPIC_API_KEY || !process.env.PI_DEMO_MODEL) {
    throw new Error('Live mode requires ANTHROPIC_API_KEY and PI_DEMO_MODEL.');
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal: AbortSignal.timeout(60000),
    headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': process.env.ANTHROPIC_API_KEY },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Model API returned HTTP ${response.status}`);
  const result = await response.json();
  console.log(`RESPONSE [API]: ${JSON.stringify(result, null, 2)}`);
  return result;
}
for (let turn = 0; turn < 6; turn++) {
  const response = await callModel({
    model: process.env.PI_DEMO_MODEL || 'MODEL_ID_FOR_ILLUSTRATION',
    max_tokens: 1024, system: '检查代码，并根据工具结果回答。', tools, messages,
  });
  messages.push({ role: 'assistant', content: response.content });
  if (response.stop_reason !== 'tool_use') {
    if (response.stop_reason !== 'end_turn') throw new Error(`Unexpected stop: ${response.stop_reason}`);
    console.log('\n完成：程序收到 end_turn。代码正确与否仍需人判断。');
    break;
  }
  const calls = response.content.filter(x => x.type === 'tool_use');
  if (!calls.length) throw new Error('tool_use stop without calls');
  const results = [];
  for (const call of calls) {
    try {
      if (call.name !== 'read' || call.input.path !== 'sum.mjs') throw new Error('Only example sum.mjs is available');
      const content = await readFile(new URL('./fixtures/sum.mjs', import.meta.url), 'utf8');
      results.push({ type: 'tool_result', tool_use_id: call.id, content });
    } catch (error) {
      results.push({ type: 'tool_result', tool_use_id: call.id, content: String(error.message), is_error: true });
    }
  }
  messages.push({ role: 'user', content: results });
  if (turn === 5) throw new Error('Turn budget exhausted');
}
