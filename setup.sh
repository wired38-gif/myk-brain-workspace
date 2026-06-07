#!/bin/bash

# ==============================================================================
# MYK's Brain - macOS Developer Environment Initializer
# Designed by MYK - Year 2026 Edition
# 
# Purpose:
#   Automates the complete local machine setup for Mike Andrews' Workspace.
#   Installs Node.js (via Homebrew if needed), configures the port rules,
#   and boots up the local neural portal.
# ==============================================================================

COLOR_CYAN='\033[0;36m'
COLOR_BLUE='\033[0;34m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_RED='\033[0;31m'
COLOR_BOLD='\033[1m'
COLOR_RESET='\033[0m'

clear
echo -e "${COLOR_CYAN}${COLOR_BOLD}"
echo "=========================================================================="
echo "    __    __  ____  __  _  '  ____     ___   ____   ____  ____  _   _     "
echo "   |  |  |  ||    ||  |/ ]   |    \   /   \ |    | /    ||    || \ | |    "
echo "   |  |  |  | |  | |  ' /    |  o  ) |     | |  | |   __||  | ||  \| |    "
echo "   |  _  |  | |  | |    \    |   _/  |  O  | |  | |  |  ||  | ||     |    "
echo "   |  |  |  | |  | |  .  \   |  |    |     | |  | |  |_ ||  | ||  _  |    "
echo "   |  |  |  | |  | |  |\  ]  |  |    |     | |  | |    _||  | ||  |  |    "
echo "   |__|  |__||____||__| \_]  |__|     \___/ |____||___|  |____||__| _|    "
echo "                                                                          "
echo "              DESIGNS BY MYK - NEURAL WORKSPACE DESKTOP SETUP             "
echo "=========================================================================="
echo -e "${COLOR_RESET}"

# 1. Check for Active CLI Tools & Dependencies
echo -e "${COLOR_BLUE}[1/5] Checking macOS prerequisites...${COLOR_RESET}"

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo -e "${COLOR_YELLOW}⚠️  Homebrew not found. Would you like to install it now? (y/n)${COLOR_RESET}"
    read -r install_brew
    if [[ $install_brew =~ ^[Yy]$ ]]; then
        echo -e "${COLOR_CYAN}Installing Homebrew (requires sudo password)...${COLOR_RESET}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo -e "${COLOR_RED}✘ Homebrew setup skipped. Node.js may need manual installation.${COLOR_RESET}"
    fi
else
    echo -e "${COLOR_GREEN}✔ Homebrew is active.${COLOR_RESET}"
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${COLOR_YELLOW}⚠️  Node.js is not installed on this machine.${COLOR_RESET}"
    if command -v brew &> /dev/null; then
        echo -e "${COLOR_CYAN}Installing Node.js dynamically via Homebrew...${COLOR_RESET}"
        brew install node
    else
        echo -e "${COLOR_RED}✘ Node.js missing! Please install it from: https://nodejs.org${COLOR_RESET}"
        exit 1
    fi
else
    NODE_VERSION=$(node -v)
    echo -e "${COLOR_GREEN}✔ Node.js is installed (${NODE_VERSION}).${COLOR_RESET}"
fi

# Check for git
if ! command -v git &> /dev/null; then
    echo -e "${COLOR_YELLOW}⚠️  Git is missing. Installing developer tools...${COLOR_RESET}"
    xcode-select --install
else
    echo -e "${COLOR_GREEN}✔ Git is available.${COLOR_RESET}"
fi

# 2. Replicate Project Directory Structure
echo -e "\n${COLOR_BLUE}[2/5] Synthesizing Directory Tree...${COLOR_RESET}"
mkdir -p "web-app"
echo -e "${COLOR_GREEN}✔ Created folder tree at: $(pwd)${COLOR_RESET}"

# 3. Create Supporting Configurations and Server files
echo -e "\n${COLOR_BLUE}[3/5] Compiling configuration templates and server modules...${COLOR_RESET}"

# Generate package.json
cat << 'PACKAGE_EOF' > package.json
{
  "name": "myk-brain-workspace",
  "version": "1.5.0",
  "description": "Zero-dependency local workspace server for MYK's Brain",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "keywords": [
    "ai",
    "workspace",
    "proxy",
    "ollama",
    "myk"
  ],
  "author": "Mike Andrews",
  "license": "MIT",
  "dependencies": {}
}
PACKAGE_EOF
echo -e "${COLOR_GREEN}✔ Synced package.json${COLOR_RESET}"

# Configure active .env with user's verified key
cat << 'ENV_EOF' > .env
# ==============================================================================
# MYK's Brain - Local Environment Configuration (Authenticated Session)
# ==============================================================================
PORT=3000
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
GEMINI_API_KEY=AQ.Ab8RN6KJ9DTKp-cR1gi7lPjby_r_SMj2zGCMZNWzUN-YvIl7ZQ
ENV_EOF
echo -e "${COLOR_GREEN}✔ Configured active local .env file with pre-populated credentials!${COLOR_RESET}"

# Generate server.js (Zero-Dependency CORS Bypass Redirect Server)
cat << 'SERVER_EOF' > server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

// Env loader
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const parts = trimmed.split('=');
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim();
                if (key) process.env[key] = val;
            }
        });
    }
} catch (e) {
    console.warn('[ENV] No .env file loaded:', e.message);
}

const PORT = process.env.PORT || 3000;

const CONTENT_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // CORS Bypass Proxy Route
    if (req.url === '/api/proxy' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);
                const { url, method, headers, data } = payload;
                console.log(`[PROXY] Active Request -> ${url}`);
                
                const targetUrl = new URL(url);
                const isHttps = targetUrl.protocol === 'https:';
                const clientModule = isHttps ? require('https') : require('http');

                const proxyReq = clientModule.request({
                    hostname: targetUrl.hostname,
                    port: targetUrl.port || (isHttps ? 443 : 80),
                    path: targetUrl.pathname + targetUrl.search,
                    method: method || 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers
                    }
                }, (proxyRes) => {
                    res.writeHead(proxyRes.statusCode, proxyRes.headers);
                    proxyRes.pipe(res);
                });

                proxyReq.on('error', (err) => {
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                });

                if (data) proxyReq.write(typeof data === 'string' ? data : JSON.stringify(data));
                proxyReq.end();
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Malformed proxy payload' }));
            }
        });
        return;
    }

    // Static Server Routing
    let filePath = req.url === '/' || req.url === '/index.html' ? path.join(__dirname, 'index.html') : path.join(__dirname, req.url);

    fs.stat(filePath, (err, stats) => {
        if (!err && stats.isDirectory()) filePath = path.join(filePath, 'index.html');
        fs.readFile(filePath, (err, content) => {
            if (err) {
                const webAppPath = path.join(__dirname, 'web-app', req.url === '/' ? 'index.html' : req.url);
                fs.readFile(webAppPath, (errSec, contentSec) => {
                    if (errSec) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('MYK-Brain Local Server: Resource Not Found (404)');
                    } else {
                        const ext = path.extname(webAppPath);
                        res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'text/plain' });
                        res.end(contentSec, 'utf-8');
                    }
                });
            } else {
                const ext = path.extname(filePath);
                res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'text/plain' });
                res.end(content, 'utf-8');
            }
        });
    });
});

server.listen(PORT, () => {
    console.log('\n============================================================ TABLET / DESKTOP ADAPTER =');
    console.log(`🚀 MYK's Brain multi-supplier engine is ONLINE!`);
    console.log(`🌐 Local Portal URL: http://localhost:${PORT}`);
    console.log(`🧠 Local Ollama:    Ready on localhost:11434 (Verify Ollama is launched locally)`);
    console.log(`🔒 Security Shield:  Local CORS proxy middleware active on /api/proxy`);
    console.log('========================================================================================\n');
    console.log('Press Ctrl+C to terminate server.');
    try { require('child_process').exec(`open http://localhost:${PORT}`); } catch (e) {}
});
SERVER_EOF
echo -e "${COLOR_GREEN}✔ Integrated server.js${COLOR_RESET}"

# 4. Pull Down Latest Core UI Dashboard (index.html)
echo -e "\n${COLOR_BLUE}[4/5] Pulling down index.html from cloud development environment...${COLOR_RESET}"
LIVE_URL="https://ais-dev-wvg22vpwcr4d34r6h4ixs2-330316077148.us-east5.run.app"

if curl -fsSL "$LIVE_URL" -o index.html; then
    echo -e "${COLOR_GREEN}✔ Core UI dynamically retrieved from Cloud workspace!${COLOR_RESET}"
    cp index.html web-app/index.html
else
    echo -e "${COLOR_YELLOW}⚠️ Could not dynamically download index.html webpage directly.${COLOR_RESET}"
fi

# 5. Booting local environment portal
echo -e "\n${COLOR_CYAN}[5/5] Launching MYK's Brain Local Server on your Mac...${COLOR_RESET}"
node server.js
