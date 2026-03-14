const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendOtpEmail = async (email, otp) => {
    const mailOptions = {
        from: '"CoreInventory IMS Support" <noreply@coreinventory.com>',
        to: email,
        subject: 'Password Reset OTP',
        text: `Your OTP for password reset is: ${otp}. It is valid for 15 minutes.`
    };

    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                reject("Error sending email");
            } else {
                resolve("OTP sent to your email");
            }
        });
    });
};

module.exports = {
    sendOtpEmail
};
