// api/scan.js — Vercel serverless function
// ==========================================
// This runs on Vercel's servers, not in the browser.
// Your API key lives here as an environment variable — staff never see it.
//
// The app calls POST /api/scan with { imageBase64, mimeType }
// This function forwards it to Anthropic and returns the product list.

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mimeType } = req.body

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'Missing imageBase64 or mimeType' })
  }

  // API key lives in Vercel environment variables — never exposed to the browser
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
  }

  const prompt = `You are a professional hairdressing assistant helping with salon stock management.
Analyse this image of a salon colour shelf and identify every professional hair colour product visible.

For each distinct product+shade combination, return:
- productName: the brand and product line, matching one of these exactly where possible: "Wella Koleston Perfect", "Wella Color Touch", "Wella Color Touch Plus", "Wella Illumina Color", "Wella Shinefinity", "L'Oréal Majirel", "L'Oréal Majirouge", "L'Oréal INOA", "L'Oréal Dia Light", "L'Oréal Dia Richesse", "Schwarzkopf IGORA Royal", "Schwarzkopf Blondme", "Redken Shades EQ", "Redken Color Fusion", "Goldwell Topchic", "Goldwell Colorance", "Olaplex"
- shadeCode: the shade or code number printed on the box/tube (e.g. "6.64", "7/0", "4-0")
- quantity: how many units of that exact shade are visible (use 1 if uncertain)

Return ONLY a raw JSON array — no markdown, no backticks, no explanation, nothing else.
Format: [{"productName":"L'Oréal Majirel","shadeCode":"6.64","quantity":4}]
If no products are identifiable, return: []`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(response.status).json({ error: err })
    }

    const data = await response.json()
    const raw = data.content?.find(b => b.type === 'text')?.text ?? ''

    // Extract JSON array robustly
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return res.status(200).json({ products: [] })

    const products = JSON.parse(match[0])
    return res.status(200).json({ products })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
