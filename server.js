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

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1509503321730322533/_5O-ubMnc25DAH2lXU4TMhCMLTOkJAvudcqA-bN_PlPGHXCnmwC4gW-X1NLvovq9fZ3g';

app.use(helmet({
    contentSecurityPolicy: false
})); 

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Traffic monitoring engine
app.use((req, res, next) => {
    console.log(`[NODE ROUTER] ${req.method} route accessed: ${req.url}`);
    next();
});

// Mask static file extensions to enable Clean URLs across all template views
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Rate limiter to safeguard endpoint processing nodes
const orderLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 3, 
    message: { success: false, message: "Security Gateway: Order rate exceeded. Please check Discord." }
});

app.use('/admin', basicAuth({
    users: { 'admin': 'atlantis123' }, 
    challenge: true,
    realm: 'AtlantisMC Secure Node'
}));

// UPGRADED API: Direct submission pipeline without UTR code blocks
app.post('/api/checkout', orderLimiter, async (req, res) => {
    try {
        const ign = validator.escape(req.body.username ? req.body.username.trim() : 'Unknown');
        const discord = validator.escape(req.body.discord ? req.body.discord.trim() : 'Unknown');
        const item = validator.escape(req.body.item || 'Generic Asset');
        const price = Number(req.body.price) || 0;

        const orderPayload = {
            id: Date.now(),
            timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            username: ign,
            discord: discord,
            item: item,
            price: price,
            status: "Awaiting Manual Reconciliation"
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
        
        currentLogs.push(orderPayload);
        fs.writeFileSync(logPath, JSON.stringify(currentLogs, null, 2), 'utf8');

        // Instant dispatch loop to Discord Staff channel
        if (DISCORD_WEBHOOK_URL) {
            const embedPayload = {
                embeds: [{
                    title: "🔔 QR Code Payment Intention Dispatched!",
                    color: 16753920, 
                    fields: [
                        { name: "Minecraft IGN", value: `\`${ign}\``, inline: true },
                        { name: "Discord Tag", value: `\`${discord}\``, inline: true },
                        { name: "Selected Package", value: `**${item}**`, inline: false },
                        { name: "Amount To Verify", value: `₹${price}`, inline: true },
                        { name: "Status", value: `\`Checking FamPay Balance\``, inline: true }
                    ],
                    footer: { text: `AtlantisMC Billing Router • ${orderPayload.timestamp}` }
                }]
            };
            
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(embedPayload)
            });
        }

        res.status(200).json({ success: true, message: "Order logged. Staff alerted for verification." });
    } catch (error) {
        console.error("Pipeline failure:", error);
        res.status(500).json({ success: false, message: "Internal server handling anomaly." });
    }
});

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
            <tr style="border-bottom: 1px solid #1e293b; background: rgba(15, 23, 42, 0.4);">
                <td style="padding: 15px;">${log.timestamp}</td>
                <td style="padding: 15px;"><span style="background: #0284c7; color: #fff; padding: 4px 8px; border-radius: 6px; font-weight: bold;">${log.username}</span></td>
                <td style="padding: 15px;"><strong>${log.item}</strong></td>
                <td style="padding: 15px; color: #10b981; font-weight: 900;">₹${log.price}</td>
                <td style="padding: 15px;">${log.discord}</td>
                <td style="padding: 15px; color: #f59e0b;">${log.status}</td>
            </tr>`;
    });

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>AtlantisMC | Telemetry Node</title>
            <style>body { background: #020617; color: #cbd5e1; font-family: system-ui, sans-serif; padding: 20px; }</style>
        </head>
        <body>
            <div style="max-width: 1200px; margin: 0 auto;">
                <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 15px; margin-bottom: 25px;">
                    <h1 style="color: #00d2ff; margin: 0;">Infrastructure Telemetry Panel</h1>
                    <div style="color: #10b981; font-weight: bold;">🟢 Systems Active</div>
                </header>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: #0f172a; border: 1px solid #1e293b; padding: 25px; border-radius: 12px; text-align: center;">
                        <h3 style="color: #94a3b8; margin: 0;">Unreconciled Revenue Pipeline</h3>
                        <p style="color: #10b981; font-size: 36px; font-weight: 900; margin: 10px 0 0 0;">₹${totalRev}</p>
                    </div>
                    <div style="background: #0f172a; border: 1px solid #1e293b; padding: 25px; border-radius: 12px; text-align: center;">
                        <h3 style="color: #94a3b8; margin: 0;">Total Intentions Logged</h3>
                        <p style="color: #f59e0b; font-size: 36px; font-weight: 900; margin: 10px 0 0 0;">${currentLogs.length}</p>
                    </div>
                </div>
                <div style="background: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; min-width: 900px;">
                        <thead>
                            <tr style="background: #1e293b; color: #38bdf8; text-transform: uppercase; font-size: 12px;">
                                <th style="padding: 15px;">Timestamp</th>
                                <th style="padding: 15px;">Player IGN</th>
                                <th style="padding: 15px;">Package</th>
                                <th style="padding: 15px;">Price Node</th>
                                <th style="padding: 15px;">Discord Profile</th>
                                <th style="padding: 15px;">State</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml ? rowsHtml : '<tr><td colspan="6" style="text-align:center; padding: 40px;">No transaction entries mapped yet.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Fallback path router to keep mobile and desktop loops fluid
app.use((req, res) => { res.redirect('/'); });

app.listen(PORT, () => console.log(`[PRO ENGINE ONLINE]: Routing cluster initialized on port ${PORT}`));
        
