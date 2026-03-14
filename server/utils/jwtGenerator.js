const jwt = require("jsonwebtoken");

function jwtGenerator(user_id) {
    const payload = {
        user: user_id
    };

    // Replace 'secret123' with a secure string in production
    return jwt.sign(payload, "secret123", { expiresIn: "1hr" });
}

module.exports = jwtGenerator;