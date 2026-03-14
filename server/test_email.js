const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'mqfhcaozczh32gmj@ethereal.email',
        pass: 'AQsgS2PVCZZGwjyT7s'
    }
});

const mailOptions = {
    from: '"CoreInventory IMS Support" <noreply@coreinventory.com>',
    to: 'test@example.com',
    subject: 'Password Reset OTP',
    text: 'Your OTP is 123456'
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error("Error sending email:", error);
    } else {
        console.log("Email sent:", info.messageId);
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    }
});
