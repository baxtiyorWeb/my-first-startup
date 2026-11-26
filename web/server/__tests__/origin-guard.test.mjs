import test from "node:test";
import assert from "node:assert/strict";
import { evaluateApiOrigin } from "../../lib/security/origin-guard.ts";

const PROD_ENV = {
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_URL: "https://www.geters.uz",
  NEXT_PUBLIC_SITE_URL: "https://www.geters.uz",
};

test("allows apex domain when NEXT_PUBLIC_APP_URL uses www", () => {
  const res = evaluateApiOrigin({
    method: "PATCH",
    pathname: "/api/users/me",
    requestUrl: "https://geters.uz/api/users/me",
    originHeader: "https://geters.uz",
    hostHeader: "geters.uz",
    forwardedHostHeader: "geters.uz",
    forwardedProtoHeader: "https",
    authorizationHeader: null,
    hasSessionCookie: true,
    env: PROD_ENV,
  });

  assert.equal(res.isAllowedOrigin, true);
  assert.equal(res.shouldBlockCsrf, false);
});

test("allows www domain when NEXT_PUBLIC_APP_URL uses apex", () => {
  const res = evaluateApiOrigin({
    method: "POST",
    pathname: "/api/posts",
    requestUrl: "https://www.geters.uz/api/posts",
    originHeader: "https://www.geters.uz",
    hostHeader: "www.geters.uz",
    forwardedHostHeader: "www.geters.uz",
    forwardedProtoHeader: "https",
    authorizationHeader: null,
    hasSessionCookie: true,
    env: {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://geters.uz",
    },
  });

  assert.equal(res.isAllowedOrigin, true);
  assert.equal(res.shouldBlockCsrf, false);
});

test("allows same-origin behind reverse proxy with internal localhost requestUrl", () => {
  const res = evaluateApiOrigin({
    method: "DELETE",
    pathname: "/api/posts/123",
    requestUrl: "http://127.0.0.1:3000/api/posts/123",
    originHeader: "https://preview-branch.vercel.app",
    hostHeader: "127.0.0.1:3000",
    forwardedHostHeader: "preview-branch.vercel.app",
    forwardedProtoHeader: "https",
    authorizationHeader: null,
    hasSessionCookie: true,
    env: PROD_ENV,
  });

  assert.equal(res.isAllowedOrigin, true);
  assert.equal(res.shouldBlockCsrf, false);
});

test("blocks cross-origin state-changing CSRF requests from untrusted domains", () => {
  const res = evaluateApiOrigin({
    method: "POST",
    pathname: "/api/posts",
    requestUrl: "https://www.geters.uz/api/posts",
    originHeader: "https://evil.example.com",
    hostHeader: "www.geters.uz",
    forwardedHostHeader: "www.geters.uz",
    forwardedProtoHeader: "https",
    authorizationHeader: null,
    hasSessionCookie: true,
    env: PROD_ENV,
  });

  assert.equal(res.isAllowedOrigin, false);
  assert.equal(res.shouldBlockCsrf, true);
});

test("allows native mobile and Bearer-only clients without session cookie", () => {
  const noOrigin = evaluateApiOrigin({
    method: "POST",
    pathname: "/api/users/sardor/follow",
    requestUrl: "https://www.geters.uz/api/users/sardor/follow",
    originHeader: null,
    hostHeader: "www.geters.uz",
    forwardedHostHeader: "www.geters.uz",
    forwardedProtoHeader: "https",
    authorizationHeader: "Bearer eyJhbGciOiJIUzI1NiJ9.test",
    hasSessionCookie: false,
    env: PROD_ENV,
  });
  assert.equal(noOrigin.shouldBlockCsrf, false);

  const bearerWithForeignOrigin = evaluateApiOrigin({
    method: "POST",
    pathname: "/api/users/sardor/follow",
    requestUrl: "https://www.geters.uz/api/users/sardor/follow",
    originHeader: "http://localhost:54321",
    hostHeader: "www.geters.uz",
    forwardedHostHeader: "www.geters.uz",
    forwardedProtoHeader: "https",
    authorizationHeader: "Bearer eyJhbGciOiJIUzI1NiJ9.test",
    hasSessionCookie: false,
    env: PROD_ENV,
  });
  assert.equal(bearerWithForeignOrigin.isAllowedOrigin, false);
  assert.equal(bearerWithForeignOrigin.shouldBlockCsrf, false);
});

test("allows RevenueCat and inPAY webhook paths regardless of origin", () => {
  for (const pathname of [
    "/api/subscriptions/webhook",
    "/api/subscriptions/revenuecat/webhook",
  ]) {
    const res = evaluateApiOrigin({
      method: "POST",
      pathname,
      requestUrl: `https://www.geters.uz${pathname}`,
      originHeader: "https://api.revenuecat.com",
      hostHeader: "www.geters.uz",
      forwardedHostHeader: "www.geters.uz",
      forwardedProtoHeader: "https",
      authorizationHeader: null,
      hasSessionCookie: false,
      env: PROD_ENV,
    });
    assert.equal(res.isWebhook, true);
    assert.equal(res.shouldBlockCsrf, false);
  }
});

test("allows local dev ports and LAN IPs outside production, blocks them in production", () => {
  const devRes = evaluateApiOrigin({
    method: "POST",
    pathname: "/api/posts",
    requestUrl: "http://localhost:3001/api/posts",
    originHeader: "http://192.168.1.42:3001",
    hostHeader: "localhost:3001",
    forwardedHostHeader: null,
    forwardedProtoHeader: null,
    authorizationHeader: null,
    hasSessionCookie: true,
    env: { NODE_ENV: "development" },
  });
  assert.equal(devRes.isAllowedOrigin, true);
  assert.equal(devRes.shouldBlockCsrf, false);

  const prodRes = evaluateApiOrigin({
    method: "POST",
    pathname: "/api/posts",
    requestUrl: "https://www.geters.uz/api/posts",
    originHeader: "http://192.168.1.42:3001",
    hostHeader: "www.geters.uz",
    forwardedHostHeader: "www.geters.uz",
    forwardedProtoHeader: "https",
    authorizationHeader: null,
    hasSessionCookie: true,
    env: PROD_ENV,
  });
  assert.equal(prodRes.isAllowedOrigin, false);
  assert.equal(prodRes.shouldBlockCsrf, true);
});
