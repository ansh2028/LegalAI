// API base URL — relative path goes through Vite proxy (no CORS issues)
const BASE_URL = "/api";

// ── helpers ──────────────────────────────────────────────
function getToken() {
    return localStorage.getItem("token");
}

function authHeaders() {
    const token = getToken();
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

/** Safely parse a response as JSON — never throws on empty / HTML bodies */
async function safeJson(res) {
    try {
        const text = await res.text();
        if (!text || !text.trim()) return {};
        return JSON.parse(text);
    } catch {
        return {};
    }
}

// ── Auth ─────────────────────────────────────────────────

export async function register({ username, email, password }) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email, password })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.message || `Registration failed (${res.status})`);
    if (data.token) localStorage.setItem("token", data.token);
    if (data.user)  localStorage.setItem("user", JSON.stringify(data.user));
    return data;
}

export async function login({ username, password }) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.message || `Login failed (${res.status})`);
    if (data.token) localStorage.setItem("token", data.token);
    if (data.user)  localStorage.setItem("user", JSON.stringify(data.user));
    return data;
}

export async function logout() {
    try {
        await fetch(`${BASE_URL}/auth/logout`, {
            method: "POST",
            headers: authHeaders(),
            credentials: "include"
        });
    } catch { /* ignore */ }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
}

export function getCurrentUser() {
    try {
        const u = localStorage.getItem("user");
        return u ? JSON.parse(u) : null;
    } catch { return null; }
}

// ── PDF upload ────────────────────────────────────────────

export async function uploadPDF(file) {
    const token = getToken();
    const formData = new FormData();
    formData.append("pdf", file);

    const res = await fetch(`${BASE_URL}/chat/upload-pdf`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData   // no Content-Type header — let browser set multipart boundary
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.message || `Upload failed (${res.status})`);
    return data;
}

// ── Streaming chat ────────────────────────────────────────

export async function* streamChat({ message, history, pdfContext }) {
    const token = getToken();

    let res;
    try {
        res = await fetch(`${BASE_URL}/chat/message`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ message, history, pdfContext })
        });
    } catch (networkErr) {
        throw new Error("Cannot reach the server. Make sure the backend is running.");
    }

    if (!res.ok) {
        // Safely read error body without assuming it's JSON
        const errData = await safeJson(res);
        throw new Error(
            errData.message ||
            `Server error ${res.status}. ${res.status === 401 ? "Please log in again." : "Try again."}`
        );
    }

    // Stream SSE chunks
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep the last (potentially incomplete) line

        for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
                yield JSON.parse(raw);
            } catch {
                // skip malformed SSE frames
            }
        }
    }

    // Flush remaining buffer
    if (buffer.startsWith("data: ")) {
        const raw = buffer.slice(6).trim();
        if (raw) {
            try { yield JSON.parse(raw); } catch { /* ignore */ }
        }
    }
}
