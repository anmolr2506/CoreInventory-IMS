const request = require("supertest");

// NOTE: These are smoke tests for middleware wiring.
// They require a configured database and JWT secret to fully pass in CI.
const app = require("../app");

describe("Approval gate wiring", () => {
    test("Unauthenticated dashboard access is blocked", async () => {
        const res = await request(app).get("/dashboard/stats");
        expect(res.status).toBe(403);
    });

    test("Unauthenticated approvals list is blocked", async () => {
        const res = await request(app).get("/approvals/pending");
        expect(res.status).toBe(403);
    });
});

