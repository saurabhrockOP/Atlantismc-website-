const express = require('express');
const fs = require('fs');
const path = require('path');
const basicAuth = require('express-basic-auth');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// The Critical Discord Webhook
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1509503321730322533/_5O-ubMnc25DAH2lXU4TMhCMLTOkJAvudcqA-bN_PlPGHXCnmwC4gW-X1NLvovq9fZ3g';

// THE FIX: Telling Helmet to allow our store buttons to actually run!
app.use(helmet({
    contentSecurityPolicy: false
})); 

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// NEW FEATURE: Simple Request Logger (Helps you track traffic in Render console)
app.use((req, res, next) => {
    console.log(`[NETWORK TRAFFIC] ${req.method} request to ${req.url}`);
    next();
});

// THE MAGIC FIX: This automatically hides .html from your URLs!
app.use(express.static(path.join(__dirname, 'public'), { 
    extensions: ['html'] 
}));

// Rate Limiter: Blocks DDoS and Form Spam
const checkoutLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, 
    max: 5, 
    message: { success: false, message: "Security Node: Too many requests. Try again in 10 minutes." }
});

// Secure Administrator Gateway
app.use('/admin', basicAuth({
    users: { 'admin': 'atlantis123' }, 
    challenge: true,
    realm: 'AtlantisMC Cloud Network'
}));

// API: Secure Checkout Pipeline with UTR Verification
app.post('/api/checkout', checkoutLimiter, async (req, res) => {
    try {
        const ign = validator.escape(req.body.username ? req.body.username.trim() : 'Unknown');
        const discord = validator.escape(req.body.discord ? req.body.discord.trim() : 'Unknown');
        const utr = validator.escape(req.body.utr ? req.body.utr.trim() : 'Missing UTR');
        const item = validator.escape(req.body.item || 'Generic Item');
        const price = Number(req.body.price) || 0;

        // Auto-generate Log Entry
        const orderLog = {
            id: Date.now(),
            timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            username: ign,
            discord: discord,
            utr_code: utr,
            item: item,
            price: price,
            status: "Awaiting Staff UTR Check"
        };

        const logPath = path.join(__dirname, 'logs.json');
        let currentLogs = [];
        
        if (fs.existsSync(logPath)) {
            try { 
                currentLogs = JSON.parse(fs.readFileSync(logPath, 'utf8')); 
            } catch (err) { 
                currentLogs = []; 
            }
        }
        
        currentLogs.push(orderLog);
        fs.writeFileSync(logPath, JSON.stringify(currentLogs, null, 2), 'utf8');

        // Dispatch Discord Webhook Receipt
        if (DISCORD_WEBHOOK_URL) {
            const embedPayload = {
                embeds: [{
                    title: "💳 New Fampay Transaction Logged!",
                    color: 16021504, 
                    fields: [
                        { name: "Minecraft IGN", value: `\`${ign}\``, inline: true },
                        { name: "Discord Profile", value: `\`${discord}\``, inline: true },
                        { name: "Requested Item", value: `**${item}**`, inline: false },
                        { name: "Expected Payment", value: `₹${price}`, inline: true },
                        { name: "12-Digit UTR Code", value: `\`${utr}\``, inline: true }
                    ],
                    footer: { text: `AtlantisMC Secure Node • ${orderLog.timestamp}` }
                }]
            };
            try {
                await fetch(DISCORD_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(embedPayload)
                });
            } catch (e) { 
                console.error("Webhook dispatch error"); 
            }
        }

        res.status(200).json({ success: true, message: "Transaction secured in database." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server anomaly." });
    }
});

// API: Pro SaaS Admin Dashboard Generator
app.get('/admin', (req, res) => {
    const logPath = path.join(__dirname, 'logs.json');
    let currentLogs = [];
    let totalRev = 0;

    if (fs.existsSync(logPath)) {
        try { 
            currentLogs = JSON.parse(fs.readFileSync(logPath, 'utf8')); 
            currentLogs.forEach(log => totalRev += (Number(log.price) || 0));
        } catch (err) { 
            currentLogs = []; 
        }
    }

    let rowsHtml = '';
    currentLogs.reverse().forEach(log => {
        rowsHtml += `
            <tr style="border-bottom: 1px solid #1e293b; background: rgba(15, 23, 42, 0.4); transition: all 0.2s;">
                <td style="padding: 15px;">${log.timestamp}</td>
                <td style="padding: 15px;"><span style="background: #0284c7; color: #fff; padding: 4px 8px; border-radius: 6px; font-weight: bold;">${log.username}</span></td>
                <td style="padding: 15px;"><strong>${log.item}</strong></td>
                <td style="padding: 15px; color: #10b981; font-weight: 900; font-size: 16px;">₹${log.price}</td>
                <td style="padding: 15px; color: #f59e0b; font-family: monospace; font-size: 16px;">${log.utr_code}</td>
                <td style="padding: 15px;">${log.discord}</td>
            </tr>`;
    });

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AtlantisMC | Cloud Console</title>
            <style>body { background: #020617; color: #cbd5e1; font-family: system-ui, sans-serif; padding: 20px; margin: 0; }</style>
        </head>
        <body>
            <div style="max-width: 1200px; margin: 0 auto;">
                <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 15px; margin-bottom: 25px;">
                    <h1 style="color: #00d2ff; margin: 0;">AtlantisMC Command Center</h1>
                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; color: #10b981; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 13px;">🟢 Systems Nominal</div>
                </header>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: #0f172a; border: 1px solid #1e293b; padding: 25px; border-radius: 12px; text-align: center;">
                        <h3 style="color: #94a3b8; font-size: 14px; text-transform: uppercase; margin: 0 0 10px 0;">Gross Revenue</h3>
                        <p style="color: #10b981; font-size: 36px; font-weight: 900; margin: 0;">₹${totalRev}</p>
                    </div>
                    <div style="background: #0f172a; border: 1px solid #1e293b; padding: 25px; border-radius: 12px; text-align: center;">
                        <h3 style="color: #94a3b8; font-size: 14px; text-transform: uppercase; margin: 0 0 10px 0;">Total Orders Logged</h3>
                        <p style="color: #f59e0b; font-size: 36px; font-weight: 900; margin: 0;">${currentLogs.length}</p>
                    </div>
                </div>

                <div style="background: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; min-width: 900px;">
                        <thead>
                            <tr style="background: #1e293b; color: #38bdf8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
                                <th style="padding: 15px;">Date & Time</th>
                                <th style="padding: 15px;">Player IGN</th>
                                <th style="padding: 15px;">Package</th>
                                <th style="padding: 15px;">Amount</th>
                                <th style="padding: 15px;">Fampay UTR (12-Digit)</th>
                                <th style="padding: 15px;">Discord Profile</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml ? rowsHtml : '<tr><td colspan="6" style="text-align:center; padding: 40px; color:#64748b;">Awaiting incoming transactions...</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        </body>
        </html>
    `);
});

// NEW FEATURE: 404 Fallback Route
// If a player types a broken link (like atlantismc.fun/stor), this automatically sends them back to the main hub instead of crashing.
app.use((req, res) => {
    res.redirect('/');
});

app.listen(PORT, () => console.log(`[INFRASTRUCTURE ONLINE]: AtlantisMC running on port ${PORT}`));
