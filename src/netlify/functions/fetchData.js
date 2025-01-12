exports.handler = async function () {
    try {
        const API_KEY = process.env.API_SECRET_KEY;
        console.log(API_KEY);
        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "API key is missing in environment variables." }),
            };
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
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `API Request Failed: ${response.statusText}` }),
            };
        }

        const data = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify({ apiKey: API_KEY, data }), // Return both for debugging
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
