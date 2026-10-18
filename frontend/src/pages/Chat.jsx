import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { uploadPDF, streamChat, logout, getCurrentUser } from "../api";
import "../styles/chat.css";

/* ─── Typing dots ─── */
const TypingIndicator = () => (
  <div className="typing-indicator">
    <span /><span /><span />
  </div>
);

/* ─── Render AI markdown-ish text ─── */
const RenderText = ({ text }) => {
  if (!text) return <TypingIndicator />;
  return text.split("\n").map((line, i) => {
    if (/^\*\*(.+)\*\*$/.test(line.trim()))
      return <p key={i} className="msg-heading">{line.replace(/\*\*/g, "")}</p>;
    if (/^\*\*(.+)\*\*/.test(line))
      return <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />;
    if (/^[-•*]\s/.test(line))
      return <p key={i} className="msg-bullet"><span className="bullet-dot">●</span><span>{line.slice(2)}</span></p>;
    if (/^\d+\.\s/.test(line))
      return <p key={i} className="msg-numbered"><span className="num-dot">{line.match(/^\d+\./)[0]}</span><span>{line.replace(/^\d+\.\s*/, "")}</span></p>;
    if (line.trim() === "") return <div key={i} className="line-gap" />;
    return <p key={i}>{line}</p>;
  });
};

/* ─── Single message bubble ─── */
const MessageBubble = ({ msg }) => {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!msg.content) return;
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`msg-row ${isUser ? "msg-user" : "msg-ai"}`}>
      <div className={`avatar ${isUser ? "av-user" : "av-ai"}`}>
        {isUser ? "U" : "⚖"}
      </div>
      <div className={`bubble ${isUser ? "b-user" : "b-ai"}`}>
        <RenderText text={msg.content} />
        <div className="msg-footer-row">
          {!isUser && msg.content && (
            <button className={`copy-btn ${copied ? "copy-done" : ""}`} onClick={handleCopy} title="Copy response">
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
          )}
          <span className="msg-ts">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Chat component ─── */
const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();

  const WELCOME = {
    id: 0,
    role: "ai",
    content:
      "**Hello there! I'm LegalAI ⚖️**\n\nYour friendly Indian legal companion. Tell me what's on your mind or upload an FIR / legal document, and I'll break it down for you:\n\n• **Understand Charges:** Plain-English explanation of IPC / BNS sections\n• **Know Your Rights:** Bail eligibility, police procedures & protections\n• **Next Steps:** Practical remedies and immediate actions to take\n\nHow can I help you today? Ask below or pick a quick question!",
    timestamp: Date.now(),
  };

  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pdfContext, setPdfContext] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOverlay, setMobileOverlay] = useState(false);
  const [error, setError] = useState("");
  const [inputRows, setInputRows] = useState(1);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  /* pre-fill from Home */
  useEffect(() => {
    if (location.state?.initialMessage) setInput(location.state.initialMessage);
    if (location.state?.pdfText) {
      setPdfContext(location.state.pdfText);
      setPdfName(location.state.pdfName || "Document");
    }
  }, [location.state]);

  /* auto scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* auto-resize textarea */
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  };

  const buildHistory = () =>
    messages
      .filter((m) => m.id !== 0)
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));

  const sendMessage = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isLoading) return;

    setInput("");
    setError("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg = { id: Date.now(), role: "user", content: trimmed, timestamp: Date.now() };
    const aiId = Date.now() + 1;
    const aiMsg = { id: aiId, role: "ai", content: "", timestamp: Date.now() + 1 };

    setMessages((p) => [...p, userMsg, aiMsg]);
    setIsLoading(true);

    try {
      const stream = streamChat({ message: trimmed, history: buildHistory(), pdfContext });
      let full = "";
      for await (const chunk of stream) {
        if (chunk.error) throw new Error(chunk.error);
        if (!chunk.done) {
          full += chunk.text;
          setMessages((p) => p.map((m) => (m.id === aiId ? { ...m, content: full } : m)));
        }
      }
    } catch (err) {
      const msg = err.message || "Something went wrong. Please try again.";
      setError(msg);
      setMessages((p) =>
        p.map((m) => (m.id === aiId ? { ...m, content: `❌ ${msg}` } : m))
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const onDrop = useCallback(async (accepted) => {
    const file = accepted[0];
    if (!file) return;
    setPdfError("");
    setPdfUploading(true);
    setPdfName(file.name);
    try {
      const r = await uploadPDF(file);
      setPdfContext(r.pdfText);
      setMessages((p) => [
        ...p,
        {
          id: Date.now(),
          role: "ai",
          content: `**Document loaded: ${file.name}**\n\n${r.numPages} page(s) parsed. Ask me anything about this document!`,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      setPdfError(err.message || "Upload failed");
      setPdfName("");
    } finally {
      setPdfUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: pdfUploading,
  });

  const clearPDF = () => { setPdfContext(""); setPdfName(""); setPdfError(""); };
  const clearChat = () => { setMessages([WELCOME]); setError(""); };
  const handleLogout = async () => { await logout(); navigate("/login"); };

  const openSidebar = () => {
    setSidebarOpen(true);
    setMobileOverlay(true);
  };
  const closeSidebar = () => {
    setSidebarOpen(false);
    setMobileOverlay(false);
  };

  const quickPrompts = [
    "🛡️ What are my rights if detained or questioned?",
    "📄 Can you break down charges in this legal document?",
    "⚖️ How do I apply for bail & is it bailable?",
    "🔍 What is IPC Section 420 (Fraud & Cheating)?",
    "📝 How do I draft and file a police complaint?",
    "📌 What is the difference between bailable & non-bailable?",
  ];

  return (
    <div className="cl">
      {/* Mobile overlay */}
      {mobileOverlay && <div className="mob-overlay" onClick={closeSidebar} />}

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${sidebarOpen ? "sb-open" : "sb-closed"}`}>
        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-logo-icon">⚖️</div>
          <span className="sb-logo-text">LegalAI</span>
          <button className="sb-close-btn" onClick={closeSidebar} title="Close sidebar">✕</button>
        </div>

        <div className="sb-scroll">
          {/* User card */}
          <div className="sb-user-card">
            <div className="sb-av">U</div>
            <div>
              <p className="sb-uname">{user?.userName || "Guest"}</p>
              <p className="sb-urole">Legal Assistant Session</p>
            </div>
          </div>

          {/* PDF section */}
          <div className="sb-sec">
            <p className="sb-sec-title">📂 Document</p>
            {pdfName ? (
              <div className="pdf-card">
                <div className="pdf-card-top">
                  <span className="pdf-card-icon">📄</span>
                  <span className="pdf-card-name">{pdfName}</span>
                </div>
                <button className="pdf-del-btn" onClick={clearPDF}>✕ Remove document</button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`sb-dz ${isDragActive ? "dz-over" : ""} ${pdfUploading ? "dz-busy" : ""}`}
              >
                <input {...getInputProps()} />
                {pdfUploading ? (
                  <><div className="dz-spinner" /><p>Parsing PDF…</p></>
                ) : isDragActive ? (
                  <><span className="dz-big">📥</span><p>Drop to upload</p></>
                ) : (
                  <>
                    <span className="dz-big">📤</span>
                    <p className="dz-main">Upload FIR / Legal Doc</p>
                    <p className="dz-sub">PDF only · max 10 MB</p>
                  </>
                )}
              </div>
            )}
            {pdfError && <p className="pdf-err">{pdfError}</p>}
          </div>

          {/* Quick prompts */}
          <div className="sb-sec">
            <p className="sb-sec-title">⚡ Quick Questions</p>
            <div className="qp-list">
              {quickPrompts.map((q, i) => (
                <button
                  key={i}
                  className="qp-btn"
                  onClick={() => { sendMessage(q); if (mobileOverlay) closeSidebar(); }}
                  disabled={isLoading}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="sb-footer">
          <button className="sb-act sb-clear" onClick={clearChat}>🗑 Clear Chat</button>
          <button className="sb-act sb-logout" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <button className="hdr-menu" onClick={openSidebar} title="Open sidebar">
            <span /><span /><span />
          </button>
          <div className="hdr-info">
            <h1 className="hdr-title">⚖️ LegalAI</h1>
            <div className="hdr-status">
              <span className="status-dot" />
              {pdfName ? `Analyzing: ${pdfName}` : "Online · Ready to help"}
            </div>
          </div>
          <div className="hdr-right">
            {pdfName && (
              <div className="hdr-pdf-chip">
                📄 <span>{pdfName}</span>
                <button onClick={clearPDF}>✕</button>
              </div>
            )}
            <button className="hdr-logout" onClick={handleLogout} title="Logout">🚪</button>
          </div>
        </header>

        {/* Messages */}
        <div className="messages">
          <div className="messages-inner">
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="msg-row msg-ai">
                <div className="avatar av-ai">⚖</div>
                <div className="bubble b-ai"><TypingIndicator /></div>
              </div>
            )}
            {error && <div className="err-banner">⚠️ {error}</div>}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="input-area">
          <div className="input-box">
            <textarea
              ref={(el) => { textareaRef.current = el; inputRef.current = el; }}
              className="chat-ta"
              placeholder="Ask a legal question or describe your situation…"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={isLoading}
              rows={1}
            />
            <button
              className={`send-btn ${input.trim() && !isLoading ? "send-active" : ""}`}
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              title="Send (Enter)"
            >
              {isLoading ? <span className="send-spin" /> : <span className="send-arrow">↑</span>}
            </button>
          </div>
          <p className="input-tip">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
