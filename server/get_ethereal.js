const nodemailer = require('nodemailer');

async function getTestAccount() {
    const account = await nodemailer.createTestAccount();
    console.log(`USER: ${account.user}`);
    console.log(`PASS: ${account.pass}`);
}

getTestAccount();
