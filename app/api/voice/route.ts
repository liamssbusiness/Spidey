import { textToSpeech } from '@/lib/elevenlabs'

export async function POST(req: Request) {
  try {
    const { text } = await req.json()
    if (!text || typeof text !== 'string') {
      return Response.json({ error: 'Missing text' }, { status: 400 })
    }

    // Sanitize — strip markdown before sending to TTS
    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .trim()
      .slice(0, 500) // Keep audio response snappy

    const audio = await textToSpeech(clean)
    return new Response(audio.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audio.length.toString(),
      },
    })
  } catch (err) {
    console.error('Voice error:', err)
    return Response.json({ error: 'Voice unavailable' }, { status: 500 })
  }
}
