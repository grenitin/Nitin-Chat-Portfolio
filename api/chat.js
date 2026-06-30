export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { systemPrompt, conversationHistory } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server misconfiguration: API key is missing.' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        system_instruction: {
            parts: [{ text: systemPrompt }]
        },
        contents: conversationHistory
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", errorText);
            return res.status(500).json({ 
                error: "System Offline: Error communicating with AI. Please contact Nitin directly at 9024930553.",
                details: errorText 
            });
        }

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        
        return res.status(200).json({ reply: aiText });
    } catch (error) {
        console.error("Backend fetch error:", error);
        return res.status(500).json({ error: "System Offline: Network error. Please contact Nitin directly at 9024930553." });
    }
}
