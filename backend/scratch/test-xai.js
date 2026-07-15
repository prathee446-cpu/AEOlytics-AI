const OpenAI = require('openai');

const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY || "YOUR_XAI_API_KEY",
  baseURL: 'https://api.x.ai/v1',
  timeout: 20000,
});

async function main() {
  console.log("Testing xAI API connection...");
  try {
    const result = await xai.chat.completions.create({
      model: 'grok-latest', // Let's try grok-latest
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello!' }
      ],
    });
    console.log("xAI Response:", result.choices[0].message.content);
  } catch (err) {
    console.error("xAI Error:", err.message);
    if (err.response) {
      console.error("xAI Status:", err.response.status);
      console.error("xAI Response Body:", err.response.data);
    }
  }
}

main();
