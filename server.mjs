import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arch, cpus, freemem, hostname, platform, release, totalmem, type, uptime } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const root = fileURLToPath(new URL('./dist', import.meta.url));
const port = Number(process.env.PORT || 4173);
const execFileAsync = promisify(execFile);
let systemCache = null;
let systemCacheTime = 0;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 2_000_000) throw new Error('Request is too large');
  }
  return JSON.parse(body || '{}');
}

function extractOpenAiText(payload) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const parts = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

async function callOpenAI(messages, model) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not configured');
    error.code = 'missing_key';
    throw error;
  }

  const input = messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const apiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      instructions: [
        'Ты Dima AI, системный помощник браузерной операционной системы DimaOS 11.',
        'Всегда отвечай по-русски, если пользователь не попросил другой язык.',
        'Отвечай ясно и по существу. Не утверждай, что выполнил действие, если оно не было выполнено интерфейсом.',
        'Ты можешь объяснять функции DimaOS, помогать с компьютерами, текстом, кодом и обычными вопросами.',
      ].join(' '),
      input,
      reasoning: { effort: 'low' },
      max_output_tokens: 1200,
    }),
  });

  const payload = await apiResponse.json();
  if (!apiResponse.ok) {
    const error = new Error(payload?.error?.message || `OpenAI error ${apiResponse.status}`);
    error.code = payload?.error?.code || 'openai_error';
    throw error;
  }

  return {
    text: extractOpenAiText(payload) || 'Модель вернула пустой ответ.',
    model: payload.model || model,
    responseId: payload.id,
  };
}

async function callOllama(messages, model) {
  const endpoint = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
  const apiResponse = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || process.env.OLLAMA_MODEL || 'llama3.2',
      messages: [
        {
          role: 'system',
          content: 'Ты Dima AI, русскоязычный системный помощник DimaOS 11. Отвечай кратко и полезно.',
        },
        ...messages,
      ],
      stream: false,
    }),
  });

  const payload = await apiResponse.json();
  if (!apiResponse.ok) throw new Error(payload?.error || `Ollama error ${apiResponse.status}`);
  return {
    text: payload?.message?.content || 'Локальная модель вернула пустой ответ.',
    model: payload.model || model,
  };
}

async function handleAi(request, response) {
  try {
    const body = await readJson(request);
    const provider = body.provider === 'ollama' ? 'ollama' : 'openai';
    const messages = Array.isArray(body.messages)
      ? body.messages.slice(-20).map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: String(message.content || '').slice(0, 20_000),
        }))
      : [];

    if (!messages.length) return json(response, 400, { error: 'Сообщение не указано.' });
    const result = provider === 'ollama'
      ? await callOllama(messages, body.model)
      : await callOpenAI(messages, body.model);
    json(response, 200, { ...result, provider });
  } catch (error) {
    const missingKey = error?.code === 'missing_key';
    json(response, missingKey ? 503 : 500, {
      error: error?.message || 'AI request failed',
      code: error?.code || 'ai_error',
      hint: missingKey
        ? 'Запустите SETUP-DimaAI.cmd и перезапустите DimaOS.'
        : undefined,
    });
  }
}

async function runPowerShell(script) {
  const result = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    {
      windowsHide: true,
      timeout: 8000,
      maxBuffer: 1024 * 1024,
      encoding: 'utf8',
    },
  );
  const output = result.stdout.trim().replace(/^\uFEFF/, '');
  if (!output) return [];
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function getWindowsDetails() {
  if (platform() !== 'win32') return { gpu: [], disks: [] };
  try {
    const safePowerShell = async (script) => {
      try {
        return await runPowerShell(script);
      } catch {
        return [];
      }
    };
    let gpu = await safePowerShell("Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion,Status | ConvertTo-Json -Compress");
    if (!gpu.length) {
      gpu = await safePowerShell("Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Video\\*\\0000' -ErrorAction SilentlyContinue | Where-Object DriverDesc | Select-Object @{N='Name';E={$_.DriverDesc}},@{N='DriverVersion';E={$_.DriverVersion}},@{N='Status';E={'OK'}} | ConvertTo-Json -Compress");
    }
    let disks = await safePowerShell("Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID,VolumeName,Size,FreeSpace,FileSystem | ConvertTo-Json -Compress");
    if (!disks.length) {
      disks = await safePowerShell("Get-PSDrive -PSProvider FileSystem | Select-Object @{N='DeviceID';E={$_.Name + ':'}},@{N='VolumeName';E={'Локальный диск'}},@{N='Size';E={$_.Used + $_.Free}},@{N='FreeSpace';E={$_.Free}},@{N='FileSystem';E={'NTFS'}} | ConvertTo-Json -Compress");
    }
    const operatingSystem = await safePowerShell("Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber,OSArchitecture | ConvertTo-Json -Compress");
    const os = operatingSystem[0];
    return {
      gpu: gpu.map((item) => ({
        name: item.Name || 'Неизвестная видеокарта',
        memory: Number(item.AdapterRAM) || undefined,
        driver: item.DriverVersion || undefined,
        status: item.Status || undefined,
      })),
      disks: disks.map((item) => ({
        name: item.DeviceID || 'Диск',
        label: item.VolumeName || 'Локальный диск',
        total: Number(item.Size) || 0,
        free: Number(item.FreeSpace) || 0,
        fileSystem: item.FileSystem || undefined,
      })),
      operatingSystem: os
        ? `${os.Caption} · ${os.Version} · сборка ${os.BuildNumber}`
        : `${type()} ${release()}`,
      architecture: os?.OSArchitecture || arch(),
    };
  } catch (error) {
    console.warn('Detailed Windows hardware detection failed:', error.message);
    return { gpu: [], disks: [] };
  }
}

async function getSystemInfo() {
  if (systemCache && Date.now() - systemCacheTime < 30_000) return systemCache;
  const processors = cpus();
  const windows = await getWindowsDetails();
  systemCache = {
    source: 'system',
    computerName: hostname(),
    processor: processors[0]?.model?.trim() || 'Не определен',
    logicalProcessors: processors.length,
    architecture: windows.architecture || arch(),
    memoryTotal: totalmem(),
    memoryFree: freemem(),
    operatingSystem: windows.operatingSystem || `${type()} ${release()}`,
    platform: platform(),
    uptime: uptime(),
    gpu: windows.gpu,
    disks: windows.disks,
    measuredAt: new Date().toISOString(),
  };
  systemCacheTime = Date.now();
  return systemCache;
}

function serveStatic(request, response) {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === '/') pathname = '/index.html';
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(root, safe);
  if (!filePath.startsWith(root)) return json(response, 403, { error: 'Forbidden' });
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) filePath = join(root, 'index.html');
  response.writeHead(200, {
    'Content-Type': types[extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600',
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  if (request.url === '/api/system' && request.method === 'GET') {
    try {
      return json(response, 200, await getSystemInfo());
    } catch (error) {
      return json(response, 500, { error: error?.message || 'Hardware detection failed' });
    }
  }
  if (request.url === '/api/ai/status' && request.method === 'GET') {
    return json(response, 200, {
      openai: Boolean(process.env.OPENAI_API_KEY),
      ollama: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
      defaultModel: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
    });
  }
  if (request.url === '/api/ai' && request.method === 'POST') {
    return handleAi(request, response);
  }
  return serveStatic(request, response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`DimaOS 11 is running at http://127.0.0.1:${port}`);
  console.log(`Dima AI OpenAI: ${process.env.OPENAI_API_KEY ? 'configured' : 'not configured'}`);
});
