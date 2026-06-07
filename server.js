const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const os = require('os');

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

    // Mac Status Endpoint
    if (req.url === '/api/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'connected',
            platform: os.platform(),
            workspace: 'active',
            port: PORT
        }));
        return;
    }

    // Mac Open App Endpoint
    if (req.url === '/api/open' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const { app, url } = payload;
                console.log(`[MAC] Opening app: ${app}`);
                
                exec(`open -a "${app}" "${url || 'http://localhost:3000'}"`, (error) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    if (error) {
                        res.end(JSON.stringify({ success: false, error: error.message }));
                    } else {
                        res.end(JSON.stringify({ success: true }));
                    }
                });
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
            }
        });
        return;
    }

    // Mac Terminal Endpoint
    if (req.url === '/api/terminal' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const { command } = payload;
                console.log(`[MAC] Executing: ${command}`);
                
                exec(command, (error, stdout, stderr) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: !error,
                        stdout: stdout,
                        stderr: stderr || error?.message || ''
                    }));
                });
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
            }
        });
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
    console.log(`📱 Mac Connector:    /api/status, /api/open, /api/terminal active`);
    console.log('========================================================================================\n');
    console.log('Press Ctrl+C to terminate server.');
    try { require('child_process').exec(`open http://localhost:${PORT}`); } catch (e) {}
});
