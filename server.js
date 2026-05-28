const express = require('express');
const fs = require('fs');
const path = require('path');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Discord Webhook configuration feature
// OPTIONAL: Paste your Discord channel webhook URL between the single quotes below to get instant notifications!
const DISCORD_WEBHOOK_URL = ''; 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// SECURE ADMIN GATEWAY
// Change 'admin' and 'atlantis123' to your preferred credentials
app.use('/admin', basicAuth({
    users: { 'admin': 'atlantis123' }, 
    challenge: true,
    realm: 'AtlantisMC Administrative Core'
}));

// API Endpoint processing store orders
app.post('/api/checkout', async (req, res) => {
    try {
        const orderLog = {
            id: Date.now(),
            timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            username: req.body.username ? req.body.username.trim() : 'Unknown',
            email: req.body.email ? req.body.email.trim() : 'Unknown',
            discord: req.body.discord ? req.body.discord.trim() : 'Unknown',
            phone: req.body.phone ? req.body.phone.trim() : 'Not Provided',
            item: req.body.item || 'Generic Item',
            price: req.body.price || 0,
            status: "Pending Check"
        };

        const logPath = path.join(__dirname, 'logs.json');
        let currentLogs = [];

        if (fs.existsSync(logPath)) {
            try {
                const data = fs.readFileSync(logPath, 'utf8');
                currentLogs = JSON.parse(data);
            } catch (err) {
                currentLogs = [];
            }
        }

        currentLogs.push(orderLog);
        fs.writeFileSync(logPath, JSON.stringify(currentLogs, null, 2), 'utf8');

        // Optional Automated Feature: Discord Integration Dispatcher
        if (DISCORD_WEBHOOK_URL && DISCORD_WEBHOOK_URL.startsWith('http')) {
            const embedPayload = {
                embeds: [{
                    title: "🚨 New Payment Verification Required",
                    color: 5814783,
                    fields: [
                        { name: "Player Username", value: `\`${orderLog.username}\``, inline: true },
                        { name: "Discord Contact", value: `\`${orderLog.discord}\``, inline: true },
                        { name: "Purchase Choice", value: orderLog.item, inline: false },
                        { name: "Total Amount", value: `₹${orderLog.price}`, inline: true },
                        { name: "Phone Field", value: orderLog.phone, inline: true }
                    ],
                    footer: { text: `Logged via AtlantisMC Backend • ${orderLog.timestamp}` }
                }]
            };

            try {
                await fetch(DISCORD_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(embedPayload)
                });
            } catch (discordError) {
                console.error("Discord Webhook dispatch failed:", discordError);
            }
        }

        res.status(200).json({ success: true, message: "Order processed successfully." });
    } catch (globalError) {
        console.error("Checkout process crash intercepted:", globalError);
        res.status(500).json({ success: false, message: "Internal server handling anomaly." });
    }
});

// Production GUI view generator for Admin Panel
app.get('/admin', (req, res) => {
    const logPath = path.join(__dirname, 'logs.json');
    let currentLogs = [];

    if (fs.existsSync(logPath)) {
        try {
            currentLogs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        } catch (err) {
            currentLogs = [];
        }
    }

    let rowsHtml = '';
    currentLogs.reverse().forEach(log => {
        rowsHtml += `
            <tr>
                <td>${log.timestamp}</td>
                <td><span class="user-tag">${log.username}</span></td>
                <td>${log.item}</td>
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
            <title>AtlantisMC Console Logs</title>
            <style>
                body { background: #070b12; color: #cbd5e1; font-family: system-ui, -apple-system, sans-serif; padding: 15px; margin: 0; }
                header { max-width: 1200px; margin: 20px auto; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 15px; }
                h1 { color: #f59e0b; font-size: 22px; margin: 0; }
                .wrapper { max-width: 1200px; margin: 0 auto; overflow-x: auto; background: #0f172a; border-radius: 10px; border: 1px solid #1e293b; }
                table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; min-width: 800px; }
                th, td { padding: 14px; border-bottom: 1px solid #1e293b; }
                th { background: #1e293b; color: #38bdf8; font-weight: 600; }
                tr:hover { background: rgba(30, 41, 59, 0.5); }
                .user-tag { background: #0284c7; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
                .cash-highlight { color: #10b981; font-weight: bold; }
                .status-pill { background: #d97706; color: #fff; padding: 3px 8px; border-radius: 20px; font-size: 11px; text-transform: uppercase; font-weight: bold; }
            </style>
        </head>
        <body>
            <header>
                <h1>AtlantisMC Network Dashboard</h1>
                <div style="font-size:12px; color:#64748b;">Security Monitoring Node Active</div>
            </header>
            <div class="wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Transaction Timestamp</th>
                            <th>Minecraft Username</th>
                            <th>Selected Item Bundle</th>
                            <th>Price Logged</th>
                            <th>Discord ID Contact</th>
                            <th>Phone String</th>
                            <th>Verification Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml ? rowsHtml : '<tr><td colspan="7" style="text-align:center; color:#64748b;">No processing logs found inside server memory.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => console.log(`[SYSTEM RUNNING]: AtlantisMC Network backend active on cloud port ${PORT}`));
          
