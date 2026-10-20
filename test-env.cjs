// 测试依赖与浏览器路径可以由开发者覆盖；游戏启动不需要这些依赖。
const path=require('node:path'),fs=require('node:fs');
let playwright;
const choices=[process.env.PLAYWRIGHT_MODULE,'playwright',process.env.USERPROFILE&&path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean);
for(const choice of choices){try{playwright=require(choice);break}catch{}}
if(!playwright)throw Error('浏览器测试需要 Playwright。请执行 npm install，或设置 PLAYWRIGHT_MODULE。');
const executablePath=[process.env.CHROME_PATH,process.env.ProgramFiles&&path.join(process.env.ProgramFiles,'Google/Chrome/Application/chrome.exe'),process.env['ProgramFiles(x86)']&&path.join(process.env['ProgramFiles(x86)'],'Microsoft/Edge/Application/msedge.exe')].filter(Boolean).find(p=>fs.existsSync(p));
module.exports={chromium:playwright.chromium,executablePath};
