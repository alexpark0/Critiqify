exports.handler = async function () {
    try {
        const API_KEY = process.env.API_SECRET_KEY;
        if (!API_KEY) {
            throw new Error("API key is missing in environment variables.");
        }

        console.log("Using API Key:", API_KEY); // Debugging

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello, Gemini!" }] }]
            })
        });

        if (!response.ok) {
            throw new Error(`API Request Failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
