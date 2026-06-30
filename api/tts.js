export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const text = req.method === 'POST' ? req.body.text : req.query.text;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'OpenAI API key is missing.' });
    }
    if (!text) {
        return res.status(400).json({ error: 'Text is required.' });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                voice: 'onyx', // Professional, authoritative, clear
                input: text,
                speed: 1.15, // Make voice slightly faster
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("OpenAI TTS Error:", response.status, errorData);
            return res.status(response.status).json({ error: 'Failed to generate speech' });
        }

        // Return the raw audio buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', buffer.length);
        res.status(200).send(buffer);
    } catch (error) {
        console.error('Error generating TTS:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
