const jwt = require("jsonwebtoken");

const authorize = (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(403).json("Not Authorized");
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload.user; // user_id
        next();
    } catch (err) {
        console.error(err.message);
        return res.status(403).json("Not Authorized");
    }
};

module.exports = authorize;
