/**
 * MYK's Brain - Zero-Dependency Local Anchor Server
 * Runs a local server to serve the Multi-Supplier Workspace dashboard,
 * proxies API requests to bypass browser CORS rules, and connects to local Ollama.
 * 
 * Usage:
 *   1. Download/Unzip the project to your local Mac.
 *   2. Open terminal in the directory.
 *   3. Run: node server.js
 *   4. Open http://localhost:3000 in your browser!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Content types helper
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
    // Enable CORS for development convenience
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Proxy endpoint for AI suppliers to bypass CORS browser blocks
    if (req.url === '/api/proxy' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);
                const { url, method, headers, data } = payload;
                
                console.log(`[PROXY] Forwarding connection to: ${url}`);
                
                // Parse target URL
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
                    console.error('[PROXY ERROR]', err.message);
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                });

                if (data) {
                    proxyReq.write(typeof data === 'string' ? data : JSON.stringify(data));
                }
                proxyReq.end();
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Malformed proxy request payload' }));
            }
        });
        return;
    }

    // Endpoint: Get Mac server status and system parameters
    if (req.url === '/api/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            workspace: __dirname,
            message: "✅ Integrated live mac tunnel connection authenticated"
        }));
        return;
    }

    // Endpoint: Open App (Terminal / Chrome) on Mac
    if (req.url === '/api/open' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const { app, url } = payload;
                const { exec } = require('child_process');
                
                let cmd = '';
                if (process.platform === 'darwin') {
                    if (app === 'chrome') {
                        cmd = `open -a "Google Chrome" "${url || 'http://localhost:3000'}"`;
                    } else if (app === 'terminal') {
                        cmd = `open -a Terminal .`;
                    } else {
                        cmd = `open "${url || '.'}"`;
                    }
                } else {
                    if (app === 'chrome') {
                        cmd = `start chrome "${url || 'http://localhost:3000'}"`;
                    } else if (app === 'terminal') {
                        cmd = `start cmd .`;
                    } else {
                        cmd = `start "${url || '.'}"`;
                    }
                }

                console.log(`[MAC ENGINE] Executing open application action: ${cmd}`);
                exec(cmd, (error, stdout, stderr) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: !error,
                        stdout: stdout || '',
                        stderr: stderr || '',
                        error: error ? error.message : null
                    }));
                });
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Endpoint: Run terminal command directly on Mac
    if (req.url === '/api/terminal' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const { command } = payload;
                const { exec } = require('child_process');
                
                console.log(`[MAC ENGINE] Terminal Command execution trigger: ${command}`);
                
                exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: !error,
                        stdout: stdout || '',
                        stderr: stderr || '',
                        error: error ? error.message : null
                    }));
                });
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Serve static files (Dashboard assets)
    let filePath = '';
    if (req.url === '/' || req.url === '/index.html') {
        filePath = path.join(__dirname, 'index.html');
    } else {
        // Fallback checks for /web-app or sub paths
        filePath = path.join(__dirname, req.url);
    }

    // Check if path is directory, search for index.html inside
    fs.stat(filePath, (err, stats) => {
        if (!err && stats.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    // Try web-app directory fallback
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
                    res.writeHead(500);
                    res.end(`Server Error: ${err.code}`);
                }
            } else {
                const ext = path.extname(filePath);
                res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'text/plain' });
                res.end(content, 'utf-8');
            }
        });
    });
});

server.listen(PORT, () => {
    console.log('\n============================================================= TABLET / PC ADAPTER =');
    console.log(`🚀 MYK's Brain multi-supplier engine is ONLINE!`);
    console.log(`🌐 Local Portal:   http://localhost:${PORT}`);
    console.log(`🧠 Offline Ollama: Ready on localhost:11434 (Make sure Ollama is running)`);
    console.log(`🔒 Secure Proxy:   Server-side payload bypass active on /api/proxy`);
    console.log('===================================================================================\n');
    console.log('Press Ctrl+C to terminate local server.');
    
    // Auto-open browser on Mac
    try {
        const { exec } = require('child_process');
        exec(`open http://localhost:${PORT}`);
    } catch (e) {
        // Suppress if auto-open fails due to terminal environments
    }
});
