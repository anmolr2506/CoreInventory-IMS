const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const receiptRoutes = require("./routes/receiptRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const productRoutes = require("./routes/productRoutes");
const warehouseRoutes = require("./routes/warehouseRoutes");
const locationRoutes = require("./routes/locationRoutes");
const transferRoutes = require("./routes/transferRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const approvalUserRoutes = require("./routes/approvalUserRoutes");
const ledgerRoutes = require("./routes/ledgerRoutes");
const syncRoutes = require("./routes/syncRoutes");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/", authRoutes);
app.use("/", dashboardRoutes);
app.use("/", receiptRoutes);
app.use("/", deliveryRoutes);
app.use("/", approvalUserRoutes);
app.use("/", approvalRoutes);
app.use("/", inventoryRoutes);
app.use("/", productRoutes);
app.use("/", warehouseRoutes);
app.use("/", locationRoutes);
app.use("/", transferRoutes);
app.use("/", ledgerRoutes);
app.use("/", syncRoutes);

module.exports = app;

