import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

interface RemarkSubjectInput {
  name: string;
  obtained: number | 'ABSENT' | null;
  total: number;
  percentage: number | null;
}

interface RemarkRequestBody {
  subjects: RemarkSubjectInput[];
  overallPercentage: number;
  result: 'PASS' | 'FAIL';
  trend?: string;
  language?: 'en' | 'ur';
}

app.post('/api/remarks', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. You can still write remarks manually.',
      });
    }

    const body = req.body as RemarkRequestBody;
    if (!body || !Array.isArray(body.subjects) || body.subjects.length === 0) {
      return res.status(400).json({ error: 'Subject marks are required to generate a remark.' });
    }

    // Privacy safeguard: only subject names, marks, overall percentage, result, and trend are passed.
    // Never include student names, roll numbers, father names, or phone numbers.
    const subjectSummary = body.subjects
      .map((s) => {
        if (s.obtained === 'ABSENT') return `${s.name}: Absent (out of ${s.total})`;
        if (s.obtained === null || s.obtained === undefined) return `${s.name}: Not marked`;
        return `${s.name}: ${s.obtained}/${s.total} (${s.percentage ?? 0}%)`;
      })
      .join('; ');

    const language = body.language === 'ur' ? 'Urdu' : 'English';
    const prompt = [
      `Write a short, kind, encouraging, and specific teacher report-card remark in ${language} (1 to 2 sentences, maximum 35 words).`,
      `Do not invent any student name; refer to the student naturally (e.g. "Shows strong effort..." or in Urdu appropriate respectful phrasing).`,
      `Overall result: ${body.result} (${body.overallPercentage.toFixed(1)}%).`,
      `Subject breakdown: ${subjectSummary}.`,
      body.trend ? `Recent trend across tests: ${body.trend}.` : '',
      `Highlight strengths and gently note any subject needing extra practice.`,
    ]
      .filter(Boolean)
      .join('\n');

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an experienced, supportive school teacher writing concise report card remarks. Output only the remark text with no quotes, markdown, or prefixes.',
      },
    });

    const remark = (response.text ?? '').trim().replace(/^["']|["']$/g, '');
    if (!remark) {
      return res.status(502).json({ error: 'No remark text returned from Gemini.' });
    }

    return res.json({ remark });
  } catch (err: unknown) {
    console.error('Error generating AI remark:', err);
    const errObj = err as { status?: number; message?: string };
    const status = typeof errObj?.status === 'number' ? errObj.status : 500;
    let message = err instanceof Error ? err.message : 'Failed to generate remark.';
    try {
      const parsed = JSON.parse(message);
      if (parsed?.error?.message) {
        message = parsed.error.message;
      }
    } catch {
      // Keep original message if not JSON
    }
    if (status === 403 || message.includes('PERMISSION_DENIED')) {
      return res.status(403).json({
        error:
          'Gemini API access requires an active billing-enabled API key in Settings > Secrets. You can still type or edit remarks manually.',
      });
    }
    return res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
