const fs = require('fs');
const path = require('path');

function isWindows() {
  return process.platform === 'win32';
}

function looksLikeWindowsPath(p) {
  const v = (p || '').trim();
  if (!v) return false;
  return /^[a-zA-Z]:\\/.test(v) || v.includes('\\');
}

function resolveSteamCmdExecutable(steamCmdPathFromConfig) {
  // Backwards compatible:
  // - Windows config often stores a directory like "C:\\SteamCMD"
  // - Ubuntu install script stores the full executable path like "/usr/games/steamcmd"
  const configured = (steamCmdPathFromConfig || '').trim();
  if (!configured) return null;

  // If it's already an executable file path, return it as-is.
  const base = path.basename(configured).toLowerCase();
  if (base === 'steamcmd' || base === 'steamcmd.exe' || base === 'steamcmd.sh') {
    return configured;
  }

  // Otherwise treat as a directory.
  if (isWindows() || looksLikeWindowsPath(configured)) {
    return path.join(configured, 'steamcmd.exe');
  }

  // Linux: prefer steamcmd, but also allow steamcmd.sh
  const steamcmd = path.join(configured, 'steamcmd');
  if (fs.existsSync(steamcmd)) return steamcmd;
  return path.join(configured, 'steamcmd.sh');
}

function resolveServerExecutable(serverPathFromConfig) {
  const serverDir = (serverPathFromConfig || '').trim();
  if (!serverDir) return { executablePath: null, tried: [] };

  const treatAsWindows = isWindows() || looksLikeWindowsPath(serverDir);
  const candidates = treatAsWindows
    ? ['ArmaReforgerServer.exe']
    : ['ArmaReforgerServer', 'ArmaReforgerServer.x86_64'];

  const joiner = treatAsWindows ? path.win32.join : path.join;
  const tried = candidates.map((name) => joiner(serverDir, name));
  const found = tried.find((p) => fs.existsSync(p));

  return { executablePath: found || tried[0] || null, tried };
}

module.exports = {
  isWindows,
  looksLikeWindowsPath,
  resolveSteamCmdExecutable,
  resolveServerExecutable,
};


