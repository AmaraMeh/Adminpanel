// server/server.js
const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

const GEMINI_API_KEY = 'AIzaSyCZQ2FDlOt7uaFmp65LRq_zjhMJt2OpIgs';
const GEMINI_API_ENDPOINT = 'https://generativeai.googleapis.com/v1/models/gemini-1.5-pro:generateContent';

// CORS middleware to allow requests from the frontend origin
app.use((req, res, next) => {
    const allowedOrigin = req.headers.origin || 'https://5176-idx-e-campus-1742929441302.cluster-6yqpn75caneccvva7hjo4uejgk.cloudworkstations.dev';
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.post('/api/gemini', async (req, res) => {
    try {
        const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });

        if (!response.ok) throw new Error(`Gemini API error: ${response.statusText}`);

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Erreur lors du traitement avec Gemini' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});