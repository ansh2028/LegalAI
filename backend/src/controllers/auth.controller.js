const userModel = require("../config/models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function registerUser(req, res) {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Please provide username, email and password"
            });
        }

        const isUserAlreadyExists = await userModel.findOne({
            $or: [{ email }, { userName: username }]
        });

        if (isUserAlreadyExists) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const hash = await bcrypt.hash(password, 10);

        const user = await userModel.create({
            userName: username,
            email,
            password: hash
        });

        const secret = process.env.JWT_SECRET || process.env.JWT_SECERT || "df40efb9";

        const token = jwt.sign(
            { id: user._id, userName: user.userName },
            secret
        );

        res.cookie("token", token);

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                userName: user.userName,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

async function loginUser(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Please provide username and password"
            });
        }

        const user = await userModel.findOne({ userName: username });

        if (!user) {
            return res.status(400).json({
                message: "User not found"
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(400).json({
                message: "Invalid password"
            });
        }

        const secret = process.env.JWT_SECRET || process.env.JWT_SECERT || "df40efb9";

        const token = jwt.sign(
            { id: user._id, userName: user.userName },
            secret
        );

        res.cookie("token", token);

        res.status(200).json({
            message: "User logged in successfully",
            token,
            user: {
                id: user._id,
                userName: user.userName,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

async function logoutUser(req, res) {
    try {
        res.cookie("token", "", {
            httpOnly: true,
            expires: new Date(0)
        });

        res.status(200).json({
            message: "User logged out successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

async function getMeController(req, res) {
    try {
        const user = await userModel.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            user
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = { registerUser, loginUser, logoutUser, getMeController };