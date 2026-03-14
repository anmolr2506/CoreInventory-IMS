require("dotenv").config({ path: "../.env" });
const express = require("express");
const app = express();
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const productRoutes = require("./routes/productRoutes");
const transferRoutes = require("./routes/transferRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const warehouseRoutes = require("./routes/warehouseRoutes");
const locationRoutes = require("./routes/locationRoutes");
const approvalUserRoutes = require("./routes/approvalUserRoutes");

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/", authRoutes);
app.use("/", dashboardRoutes);
app.use("/", inventoryRoutes);
app.use("/", productRoutes);
app.use("/", transferRoutes);
app.use("/approval", approvalRoutes);
app.use("/", warehouseRoutes);
app.use("/", locationRoutes);
app.use("/", approvalUserRoutes);

app.listen(5000, () => {
    console.log("Server running on port 5000");
});