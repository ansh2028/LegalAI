const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are LegalAI, a friendly, empathetic, and knowledgeable Indian legal assistant.

Personality & Tone:
- Warm & Friendly: Speak with empathy, clarity, and reassurance. Legal issues are stressful, so make the user feel comfortable and supported. Avoid cold, intimidating legal jargon.
- Compact & Crispy: Be concise, direct, and well-structured. No long essays or repetitive filler. Keep answers high-density and easy to digest at a glance.
- Formatting Guidelines:
  1. Direct Answer: Start with a 1-2 sentence friendly, direct summary.
  2. Key Points / Legal Sections: Use crisp bullet points (•) citing relevant Indian laws (IPC/BNS, CrPC/BNSS) explained in everyday simple language.
  3. Actionable Next Steps: Provide 2-3 practical, concrete steps the user can take right now.
  4. Closing: A brief, friendly note reminding them to consult a licensed advocate for court proceedings.
- Document/FIR Analysis: If a document or FIR text is provided, concisely state:
  • Key Allegations/Charges (in plain English)
  • Bailable vs. Non-Bailable status
  • Immediate Legal Rights & Recommended Remedies.`;

// Upload and parse a PDF, store context in session
async function uploadPDF(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const filePath = req.file.path;
        const fileBuffer = fs.readFileSync(filePath);

        const pdfData = await pdfParse(fileBuffer);
        const pdfText = pdfData.text.trim();

        // Clean up temp file
        fs.unlinkSync(filePath);

        if (!pdfText) {
            return res.status(400).json({ message: "Could not extract text from PDF. The file may be scanned or image-based." });
        }

        res.status(200).json({
            message: "PDF parsed successfully",
            pdfText,
            numPages: pdfData.numpages,
            preview: pdfText.slice(0, 500)
        });
    } catch (error) {
        console.error("PDF upload error:", error);
        res.status(500).json({ message: "Error parsing PDF", error: error.message });
    }
}

// Chat with Gemini AI with streaming
async function chat(req, res) {
    try {
        const { message, history = [], pdfContext = "" } = req.body;

        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

        // Build context-aware system prompt
        let systemContext = SYSTEM_PROMPT;
        if (pdfContext) {
            systemContext += `\n\n--- DOCUMENT CONTEXT ---\nThe user has uploaded a legal document. Here is the extracted text:\n\n${pdfContext}\n--- END DOCUMENT ---\n\nAnalyze this document when answering questions about it.`;
        }

        // Convert history to Gemini format
        const geminiHistory = history.map(msg => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemContext }]
                },
                {
                    role: "model",
                    parts: [{ text: "Hello! I am LegalAI, your friendly and knowledgeable Indian legal companion. I'm here to simplify your legal documents, explain your rights, and guide your next steps clearly and empathetically. How can I assist you today?" }]
                },
                ...geminiHistory
            ],
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7,
            }
        });

        // Set up SSE headers for streaming
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const result = await chat.sendMessageStream(message);

        let fullResponse = "";

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                fullResponse += chunkText;
                res.write(`data: ${JSON.stringify({ text: chunkText, done: false })}\n\n`);
            }
        }

        res.write(`data: ${JSON.stringify({ text: "", done: true, fullText: fullResponse })}\n\n`);
        res.end();

    } catch (error) {
        console.error("Chat error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Error communicating with AI", error: error.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
            res.end();
        }
    }
}

module.exports = { uploadPDF, chat };
