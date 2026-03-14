const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwtGenerator = require("./utils/jwtGenerator");
const nodemailer = require("nodemailer");
const crypto = require("crypto"); // For generating OTP

// Middleware
app.use(express.json());
app.use(cors());

// REGISTER ROUTE
app.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Check if user exists
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length !== 0) {
            return res.status(401).json("User already exists!");
        }

        // 2. Bcrypt hashing
        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // 3. Insert into database
        const newUser = await pool.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
            [username, email, bcryptPassword]
        );

        // 4. Generate JWT token
        const token = jwtGenerator(newUser.rows[0].user_id);
        res.json({ token });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// LOGIN ROUTE
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(401).json("Password or Email is incorrect");
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password);

        if (!validPassword) {
            return res.status(401).json("Password or Email is incorrect");
        }

        const token = jwtGenerator(user.rows[0].user_id);
        res.json({ token });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// FORGOT PASSWORD FLOW

// Configure local test transporter (or real credentials here)
const transporter = nodemailer.createTransport({
    // You should use environment variables in production
    // Example using ethereal for testing if you don't have a real smtp setup ready:
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'mylene.lubowitz36@ethereal.email',
        pass: '6WgSfRbC1Pjz82nJpG'
    }
});

// 1. Request OTP
app.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) {
            return res.status(404).json("User does not exist");
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Set expiry for 15 minutes from now
        const otpExpiry = new Date(Date.now() + 15 * 60000);

        // Update database with OTP
        await pool.query(
            "UPDATE users SET reset_otp = $1, reset_otp_expiry = $2 WHERE email = $3",
            [otp, otpExpiry, email]
        );

        // Send email
        const mailOptions = {
            from: '"CoreInventory IMS Support" <noreply@coreinventory.com>',
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}. It is valid for 15 minutes.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                return res.status(500).json("Error sending email");
            }
            res.json("OTP sent to your email");
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// 2. Verify OTP
app.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await pool.query("SELECT reset_otp, reset_otp_expiry FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(404).json("User not found");
        }

        const { reset_otp, reset_otp_expiry } = user.rows[0];

        if (reset_otp !== otp) {
            return res.status(401).json("Invalid OTP");
        }

        if (new Date() > new Date(reset_otp_expiry)) {
            return res.status(401).json("OTP has expired");
        }

        res.json("OTP Verified");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// 3. Reset Password
app.post("/reset-password", async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(newPassword, salt);

        await pool.query(
            "UPDATE users SET password = $1, reset_otp = null, reset_otp_expiry = null WHERE email = $2",
            [bcryptPassword, email]
        );

        res.json("Password updated successfully");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});