exports.handler = async function () {
    const API_KEY = process.env.API_SECRET_KEY; // No VITE_ prefix needed

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${API_KEY}`);
    const data = await response.json();

    return {
        statusCode: 200,
        body: JSON.stringify(data),
    };
};
