const { createAuthLimiter, sameOrigin, securityHeaders } = require("../src/middleware/security");

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis() };
}

describe("Security middleware", () => {
  test("limits attempts by IP and permits requests after expiry", () => {
    let time = 0;
    const limiter = createAuthLimiter({ limit: 2, now: () => time });
    const res = response();
    const next = jest.fn();
    for (let i = 0; i < 3; i++) limiter({ ip: "a" }, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.set).toHaveBeenCalledWith("Retry-After", "900");
    limiter({ ip: "b" }, res, next);
    time = 900000;
    limiter({ ip: "a" }, res, next);
    expect(next).toHaveBeenCalledTimes(4);
  });

  test.each([
    ["POST", "https://evil.example", undefined, false],
    ["POST", "http://localhost:3000", "same-origin", true],
    ["POST", undefined, "cross-site", false],
    ["POST", undefined, undefined, true],
    ["GET", "https://evil.example", "cross-site", true]
  ])("checks %s origin %s and fetch metadata %s", (method, origin, site, allowed) => {
    const prior = process.env.APP_ORIGIN;
    process.env.APP_ORIGIN = "http://localhost:3000";
    const req = { method, get: key => ({ Origin: origin, "Sec-Fetch-Site": site })[key] };
    const res = response();
    const next = jest.fn();
    sameOrigin(req, res, next);
    expect(next).toHaveBeenCalledTimes(allowed ? 1 : 0);
    if (!allowed) expect(res.status).toHaveBeenCalledWith(403);
    if (prior === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = prior;
  });

  test("sets restrictive browser headers", () => {
    const res = response();
    const next = jest.fn();
    securityHeaders({}, res, next);
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
      "Content-Security-Policy": expect.stringContaining("frame-ancestors 'none'")
    }));
    expect(next).toHaveBeenCalledTimes(1);
  });
});
