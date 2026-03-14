const jwt = require("jsonwebtoken");

const authorize = (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(403).json("Not Authorized");
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const payloadUser = payload.user;

        // Support both legacy numeric payloads and object payloads.
        const userId = typeof payloadUser === "object"
            ? payloadUser?.id ?? payloadUser?.user_id
            : payloadUser;

        if (!userId) {
            return res.status(403).json("Not Authorized");
        }

        req.user = { id: userId };
        next();
    } catch (err) {
        console.error(err.message);
        return res.status(403).json("Not Authorized");
    }
};

module.exports = authorize;
