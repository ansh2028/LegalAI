const jwt = require("jsonwebtoken");

const authUser = (req, res, next) => {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized: No token provided. Please log in first."
        });
    }

    const secret = process.env.JWT_SECRET || process.env.JWT_SECERT || "df40efb9";

    // Decrypt and verify the token using secret key
    jwt.verify(token, secret, (err, user) => {
        if (err) {
            return res.status(403).json({
                message: "Forbidden: Invalid or expired token."
            });
        }

        // Attach verified user object to request
        req.user = user;
        next();
    });
};

module.exports={authUser};