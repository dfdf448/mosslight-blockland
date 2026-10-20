// 只提供本机静态资源；不访问外网、不写用户文件、不执行远程代码。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const instance = require('node:crypto').createHash('sha256').update(__dirname.toLowerCase()).digest('hex').slice(0, 16);
const root = path.resolve(__dirname, 'dist');
const port = Number(process.env.MOSSLIGHT_PORT) || 8790;
const url = 'http://127.0.0.1:' + port;
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
function openBrowser() {
  if (!process.argv.includes('--open')) return;
  const child = spawn('explorer.exe', [url], { windowsHide: true });
  child.on('error', () => console.log('请在浏览器中打开 ' + url));
}
const server = http.createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-cache');
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
  if (req.url === '/__mosslight_health') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ game: 'mosslight-islands', version: '4.2.0', instance, pid: process.pid, uptime: Math.floor(process.uptime()) })); }
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, url).pathname)); }
  catch { res.writeHead(400); return res.end('请求路径无效'); }
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end('无权访问'); }
  if (file === root || file.endsWith(path.sep)) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('未找到文件'); }
    res.setHeader('Content-Type', contentTypes[path.extname(file)] || 'application/octet-stream');
    if (req.method === 'HEAD') return res.end();
    res.end(data);
  });
});
server.on('error', err => {
  if (err.code !== 'EADDRINUSE') { console.error('服务启动失败：' + err.message); process.exitCode = 1; return; }
  // 重复启动时只打开已确认属于本游戏的本机服务。
  const req = http.get(url + '/__mosslight_health', res => {
    let text = ''; res.on('data', chunk => { text += chunk; });
    res.on('end', () => {
      try { if (JSON.parse(text).game === 'mosslight-islands') { console.log('游戏已在运行：' + url); openBrowser(); return; } } catch {}
      console.error('端口 ' + port + ' 已被其他程序占用。请修改 MOSSLIGHT_PORT 后重试。'); process.exitCode = 1;
    });
  });
  req.setTimeout(2000, () => req.destroy());
  req.on('error', () => { console.error('无法连接本机服务。请关闭旧游戏窗口后重试。'); process.exitCode = 1; });
});
server.listen(port, '127.0.0.1', () => { console.log('苔光：方块原野 v4.2 已启动：' + url + '\n关闭此窗口即可停止游戏服务。'); openBrowser(); });
module.exports = server;


