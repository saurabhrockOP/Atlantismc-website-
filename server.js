const express = require('express');
const fs = require('fs');
const path = require('path');
const basicAuth = require('express-basic-auth');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Your configured Discord Webhook for instant staff notifications
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1509503321730322533/_5O-ubMnc25DAH2lXU4TMhCMLTOkJAvudcqA-bN_PlPGHXCnmwC4gW-X1NLvovq9fZ3g'; 

// Core Security & Middleware
app.use(helmet()); // Hides Express headers from network scanners
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiter: Blocks spam attacks (Max 5 purchases per IP every 15 minutes)
const checkoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: { success: false, message: "Security protocol triggered: Too many rapid requests. Try again in 15 minutes." }
});

// Secure Admin Gateway
app.use('/admin', basicAuth({
    users: { 'admin': 'atlantis123' }, 
    challenge: true,
    realm: 'AtlantisMC Secure Cloud Core'
}));

// The Checkout API Engine
app.post('/api/checkout', checkoutLimiter, async (req, res) => {
    try {
        // Strict Input Sanitization to prevent XSS Database Injection
        const safeUsername = validator.escape(req.body.username ? req.body.username.trim() : 'Unknown');
        const safeEmail = validator.isEmail(req.body.email) ? req.body.email.trim() : 'InvalidEmail@None.com';
        const safeDiscord = validator.escape(req.body.discord ? req.body.discord.trim() : 'Unknown');
        const safePhone = validator.escape(req.body.phone ? req.body.phone.trim() : 'Not Provided');
        const safeItem = validator.escape(req.body.item || 'Generic Item');
        const numericPrice = Number(req.body.price) || 0;
        
        const orderLog = {
            id: Date.now(),
            timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            username: safeUsername,
            email: safeEmail,
            discord: safeDiscord,
            phone: safePhone,
            item: safeItem,
            price: numericPrice,
            status: "Pending Fampay Check"
        };

        const logPath = path.join(__dirname, 'logs.json');
        let currentLogs = [];

        if (fs.existsSync(logPath)) {
            try { currentLogs = JSON.parse(fs.readFileSync(logPath, 'utf8')); } 
            catch (err) { currentLogs = []; }
        }

        currentLogs.push(orderLog);
        fs.writeFileSync(logPath, JSON.stringify(currentLogs, null, 2), 'utf8');

        // Execute Discord Webhook Payload
        if (DISCORD_WEBHOOK_URL) {
            const embedPayload = {
                embeds: [{
                    title: "💎 New Store Purchase Logged!",
                    color: 16021504, // Atlantis Gold
                    fields: [
                        { name: "Minecraft IGN", value: `\`${orderLog.username}\``, inline: true },
                        { name: "Discord Contact", value: `\`${orderLog.discord}\``, inline: true },
                        { name: "Requested Package", value: `**${orderLog.item}**`, inline: false },
                        { name: "Expected Payment", value: `₹${orderLog.price}`, inline: true },
                        { name: "Phone Provided", value: orderLog.phone, inline: true }
                    ],
                    footer: { text: `AtlantisMC Secure Automated Billing • ${orderLog.timestamp}` }
                }]
            };
            try {
                await fetch(DISCORD_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(embedPayload)
                });
            } catch (discordError) { console.error("Webhook trigger failed"); }
        }

        res.status(200).json({ success: true, message: "Transaction secured." });
    } catch (globalError) {
        res.status(500).json({ success: false, message: "Cloud processing error." });
    }
});

// Advanced Analytics Admin Dashboard
app.get('/admin', (req, res) => {
    const logPath = path.join(__dirname, 'logs.json');
    let currentLogs = [];
    let totalRevenue = 0;

    if (fs.existsSync(logPath)) {
        try { 
            currentLogs = JSON.parse(fs.readFileSync(logPath, 'utf8')); 
            currentLogs.forEach(log => totalRevenue += (Number(log.price) || 0));
        } catch (err) { currentLogs = []; }
    }

    let rowsHtml = '';
    currentLogs.reverse().forEach(log => {
        rowsHtml += `
            <tr>
                <td>${log.timestamp}</td>
                <td><span class="user-tag">${log.username}</span></td>
                <td><strong>${log.item}</strong></td>
                <td class="cash-highlight">₹${log.price}</td>
                <td>${log.discord}</td>
                <td>${log.phone}</td>
                <td><span class="status-pill">${log.status}</span></td>
            </tr>`;
    });

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AtlantisMC Console | Admin</title>
            <style>
                body { background: #04070d; color: #cbd5e1; font-family: system-ui, sans-serif; padding: 20px; margin: 0; }
                header { max-width: 1200px; margin: 0 auto 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 15px; }
                h1 { color: #00d2ff; font-size: 24px; margin: 0; }
                .stats-grid { max-width: 1200px; margin: 0 auto 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .stat-box { background: #0b1325; border: 1px solid #1e293b; padding: 20px; border-radius: 10px; text-align: center; }
                .stat-box h3 { color: #94a3b8; font-size: 14px; margin: 0 0 5px 0; text-transform: uppercase; }
                .stat-box .number { color: #f59e0b; font-size: 32px; font-weight: bold; margin: 0; }
                .wrapper { max-width: 1200px; margin: 0 auto; overflow-x: auto; background: #0b1325; border-radius: 10px; border: 1px solid #1e293b; }
                table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; min-width: 900px; }
                th, td { padding: 16px; border-bottom: 1px solid #1e293b; }
                th { background: #1e293b; color: #38bdf8; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
                tr:hover { background: rgba(30, 41, 59, 0.6); }
                .user-tag { background: #0284c7; color: #fff; padding: 4px 8px; border-radius: 6px; font-weight: bold; }
                .cash-highlight { color: #10b981; font-weight: 900; font-size: 16px; }
                .status-pill { background: #d97706; color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 11px; text-transform: uppercase; font-weight: bold; }
            </style>
        </head>
        <body>
            <header>
                <h1>AtlantisMC Network Dashboard</h1>
                <div style="font-size:13px; color:#10b981; font-weight:bold;">🟢 Node Online & Secured</div>
            </header>
            
            <div class="stats-grid">
                <div class="stat-box">
                    <h3>Total Lifetime Revenue</h3>
                    <p class="number">₹${totalRevenue}</p>
                </div>
                <div class="stat-box">
                    <h3>Total Store Orders</h3>
                    <p class="number">${currentLogs.length}</p>
                </div>
            </div>

            <div class="wrapper">
                <table>
                    <thead><tr><th>Timestamp</th><th>Player IGN</th><th>Package Requested</th><th>Value</th><th>Discord Contact</th><th>Phone</th><th>Status</th></tr></thead>
                    <tbody>${rowsHtml ? rowsHtml : '<tr><td colspan="7" style="text-align:center; padding: 30px; color:#64748b;">No financial logs currently exist.</td></tr>'}</tbody>
                </table>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => console.log(`[INFRASTRUCTURE ONLINE]: AtlantisMC running on port ${PORT}`));

