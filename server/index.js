const app = require("./app");

if (require.main === module) {
    const port = Number.parseInt(process.env.PORT || "5000", 10);
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

module.exports = app;