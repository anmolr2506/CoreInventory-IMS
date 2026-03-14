const pool = require("../db");
const bcrypt = require("bcrypt");
const jwtGenerator = require("../utils/jwtGenerator");
const { sendOtpEmail } = require("../utils/email");

const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length !== 0) {
            return res.status(401).json("User already exists!");
        }

        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *",
            [username, email, bcryptPassword, 'staff']
        );

        const token = jwtGenerator(newUser.rows[0].user_id);
        res.json({ token, username: newUser.rows[0].name });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(401).json("Password or Email is incorrect");
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);

        if (!validPassword) {
            return res.status(401).json("Password or Email is incorrect");
        }

        const token = jwtGenerator(user.rows[0].user_id);
        res.json({ token, username: user.rows[0].name });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) {
            return res.status(404).json("User does not exist");
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 15 * 60000);

        await pool.query(
            "UPDATE users SET reset_otp = $1, reset_otp_expiry = $2 WHERE email = $3",
            [otp, otpExpiry, email]
        );

        const message = await sendOtpEmail(email, otp);
        res.json(message);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const verifyOtp = async (req, res) => {
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
};

const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(newPassword, salt);

        await pool.query(
            "UPDATE users SET password_hash = $1, reset_otp = null, reset_otp_expiry = null WHERE email = $2",
            [bcryptPassword, email]
        );

        res.json("Password updated successfully");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

module.exports = {
    signup,
    login,
    forgotPassword,
    verifyOtp,
    resetPassword
};
