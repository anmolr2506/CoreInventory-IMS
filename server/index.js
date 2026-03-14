require("dotenv").config({ path: "../.env" });
const express = require("express");
const app = express();
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/", authRoutes);
app.use("/", dashboardRoutes);

app.listen(5000, () => {
    console.log("Server running on port 5000");
});