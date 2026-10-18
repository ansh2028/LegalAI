# LegalAI ⚖️
Your Personal Indian Legal Assistant

LegalAI is an intelligent, full-stack legal assistance platform powered by Google Gemini AI. It enables users to understand complex Indian legal procedures, interpret First Information Reports (FIRs) and legal documents, examine applicable IPC/BNS/CrPC sections, assess bail eligibility, and receive clear, actionable next steps in plain English.

---

## 🚀 Features

- **Real-Time AI Legal Streaming**: Interactive chat with Google Gemini (`gemini-3.8-flash`) delivering empathetic, structured, and fast streaming legal explanations.
- **FIR & PDF Legal Document Analysis**: Drag-and-drop PDF parsing (`pdf-parse`) allowing the AI to analyze uploaded legal contracts, FIRs, and court notices in context.
- **IPC / CrPC / BNS Knowledge Base**: Instant explanations of rights for accused and complainants, bailable vs. non-bailable offences, and formal complaint drafting procedures.
- **Clean ChatGPT-Inspired Interface**: Crisp, modern, high-contrast UI with one-click response copying, quick questions, and seamless responsive design.
- **Secure Authentication**: JWT-based session security with protected routes and password hashing.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), React Router, React Dropzone, Vanilla CSS
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT, Multer
- **AI / LLM**: Google Generative AI SDK (`@google/generative-ai`)
- **PDF Extraction**: `pdf-parse`

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas or local MongoDB instance
- Google Gemini API key

---

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

---

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚖️ Disclaimer
LegalAI provides information for educational and preliminary guidance purposes only and does not constitute formal legal counsel. Always consult a licensed advocate for official court proceedings.
