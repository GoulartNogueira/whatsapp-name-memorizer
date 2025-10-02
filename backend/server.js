// server.js
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

let client = null;
let clientReady = false;
let qrCodeData = null;

// Initialize WhatsApp client
function initializeClient() {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', async (qr) => {
        console.log('QR Code received');
        qrCodeData = await qrcode.toDataURL(qr);
        io.emit('qr', qrCodeData);
    });

    client.on('authenticated', () => {
        console.log('Client authenticated');
        qrCodeData = null;
        io.emit('authenticated');
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        clientReady = true;
        io.emit('ready');
    });

    client.on('disconnected', (reason) => {
        console.log('Client disconnected:', reason);
        clientReady = false;
        io.emit('disconnected', reason);
    });

    client.initialize();
}

// Socket.io connection
io.on('connection', (socket) => {
    console.log('Client connected');
    
    if (qrCodeData) {
        socket.emit('qr', qrCodeData);
    } else if (clientReady) {
        socket.emit('ready');
    }

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// API Routes
app.get('/api/status', (req, res) => {
    res.json({ 
        ready: clientReady,
        hasQR: !!qrCodeData 
    });
});

app.post('/api/initialize', (req, res) => {
    if (!client) {
        initializeClient();
        res.json({ message: 'Client initializing' });
    } else {
        res.json({ message: 'Client already exists' });
    }
});

app.get('/api/groups', async (req, res) => {
    try {
        if (!clientReady) {
            return res.status(400).json({ error: 'Client not ready' });
        }

        const chats = await client.getChats();
        const groups = chats
            .filter(chat => chat.isGroup)
            .map(group => ({
                id: group.id._serialized,
                name: group.name,
                participantCount: group.participants?.length || 0,
            }));

        res.json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/group/:groupId/participants', async (req, res) => {
    try {
        if (!clientReady) {
            return res.status(400).json({ error: 'Client not ready' });
        }

        const { groupId } = req.params;
        const chat = await client.getChatById(groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        const participants = [];

        for (const participant of chat.participants) {
            try {
                const contact = await client.getContactById(participant.id._serialized);
                const profilePicUrl = await contact.getProfilePicUrl();
                console.log('Fetched profile pic URL for', participant.id._serialized, ':', profilePicUrl);
                console.log('Contact info:', contact);
                console.log('Participant info:', participant);
                // console.log('About:', await contact.getAbout());
                participants.push({
                    id: participant.id._serialized,
                    name: contact.shortname || contact.name || participant.id.user,
                    number: participant.id.user,
                    profilePicUrl: profilePicUrl || null
                });
            } catch (error) {
                console.error(`Error fetching participant ${participant.id._serialized}:`, error);
                // Add participant without photo if there's an error
                participants.push({
                    id: participant.id._serialized,
                    name: participant.id.user,
                    number: participant.id.user,
                    profilePicUrl: null
                });
            }
        }

        res.json(participants);
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});