// Test directly with fetch
const key = process.env.GOOGLE_GEMINI_API_KEY;
const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + key, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: 'O\'zbek tilida 1 ta post yoz. JSON formatda bo\'lsin: {"title": "...", "content": "..."}' }] }],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  })
});

const data = await res.json();
console.log('Status:', res.status);
console.log('Response body:', JSON.stringify(data, null, 2));
const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
console.log('Candidate text:', text);
console.log('Parsed JSON:', JSON.parse(text));
