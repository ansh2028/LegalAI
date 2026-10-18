const express = require("express");
const cors = require("cors");
const authRouter = require("./routes/auth.routes");
const chatRouter = require("./routes/chat.routes");
const app = express();
const cookieParser = require("cookie-parser");

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        const allowed = [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:3000",
            "http://127.0.0.1:5173"
        ];
        if (allowed.includes(origin)) return callback(null, true);
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Apply CORS middleware — it automatically handles OPTIONS preflights
app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "LegalAI API is running" });
});

module.exports = app;
