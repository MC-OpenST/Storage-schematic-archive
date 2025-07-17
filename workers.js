//这是一个辅助你挂cf workers的样本JavaScript文件
//This is a template javascript doc for help you add token proxy to cloudflare workers
const GITHUB_TOKEN = 'ghp_example';  // github token

const REPO_OWNER = 'HT-lab-union'; //项目拥有者，如果挂在organization下就写organization的名称/ #Repo owner, if repo is under organization use organization name
const REPO_NAME = 'document-of-litematic'; //仓库名称 /# repo name
const BASE_PATH = 'contents/schematic'; //要检测的文件位置 /# File locations to detect
const CACHE_KEY = 'file_list_cache'; // 缓存键名 /# Cache key name
const CACHE_TTL = 86400; // 缓存时间，单位为秒 /# Cache time in seconds (1Day = 86400 seconds)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // aggre all origins/允许所有 origins
  'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
  'Access-Control-Allow-Headers': '*',  // aggre all headers/允许所有 headers
  'Content-Type': 'application/json;charset=UTF-8', //utf8 decode, add more language support
};

addEventListener('fetch', event => {
  if (event.request.method === 'OPTIONS') {
    // Preflight 请求处理/Preflight request processing
    event.respondWith(new Response(null, { status: 204, headers: corsHeaders }));
    return;
  }
  event.respondWith(handleRequest(event));
});

async function fetchFilesRecursively(path, host) {
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CF-Worker-Script'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API 请求失败: ${res.status} ${text}`);
  }

  const data = await res.json();
  let results = [];

  for (const item of data) {
    if (item.type === 'dir') {
      const subResults = await fetchFilesRecursively(item.path, host);
      results = results.concat(subResults);
    } else if (item.type === 'file' && (item.name.endsWith('.litematic') || item.name.endsWith('.zip'))) {
      results.push({
        name: item.name,
        path: item.path,
        url: `https://${host}/raw/${encodeURIComponent(item.path)}`
      });
    }
  }

  return results;
}

async function handleRequest(event) {
  const request = event.request;
  const url = new URL(request.url);

  // 代理下载文件/Proxy to download document
  if (url.pathname.startsWith('/raw/')) {
    // 比如 /raw/5w storage ... 获取 fileName/#Like /raw/5w storage ... get fileName
    const fileName = decodeURIComponent(url.pathname.replace('/raw/', ''));
    // 拼接 GitHub 原始链接，主分支为 main，路径加 contents/schematic/   #Splice the original GitHub link, the main branch is main, and the path is added with contents/schematic/
    const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/contents/schematic/${fileName}`;
  
    const fileResp = await fetch(rawUrl, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
  
    const headers = new Headers(fileResp.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
  
    return new Response(fileResp.body, {
      status: fileResp.status,
      headers,
    });
  }
  
  //文件列表缓存逻辑 /# File list cache logic
  // 检查缓存是否存在，如果存在则直接返回缓存内容 /# Check if cache exists, if so return cached content directly
  const kv = event.env.FILES_KV;
  let cached = await kv.get(CACHE_KEY, 'json');
  if (cached) {
    // 如果缓存存在，直接返回缓存内容 /# If cache exists, return cached content directly
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: corsHeaders,
    });
  }

  // 返回文件列表 JSON/ #Return doclist JSON
  try {
    const files = await fetchFilesRecursively(BASE_PATH, url.host);

    return new Response(JSON.stringify(files), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}


// 注意：/# Important:
// 需要在 Cloudflare Workers 的 wragler.toml 里绑定 KV 命名空间为 “FILES_KV”
// Make sure to bind the KV namespace "FILES_KV" in wrangler.toml

// [[kv_namespaces]]
// binding = "FILES_KV"
// id = "your-kv-namespace-id"