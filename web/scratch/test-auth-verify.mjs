async function runAuthTests() {
  console.log("=== STARTING VERTICAL SLICE #1: AUTHENTICATION TESTS ===");
  const baseUrl = "http://localhost:3000";

  // Test 1: Empty payload validation (should return 400 with VALIDATION_ERROR)
  try {
    const res1 = await fetch(`${baseUrl}/api/auth/google/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json1 = await res1.json();
    console.log(`✓ Test 1: Empty body validation - Status: ${res1.status}, Code: ${json1?.error?.code}`);
    if (res1.status !== 400 || json1?.error?.code !== "VALIDATION_ERROR") {
      throw new Error(`Test 1 failed: Expected 400 VALIDATION_ERROR, got ${res1.status}`);
    }
  } catch (err) {
    console.error("Test 1 Error:", err);
    process.exit(1);
  }

  // Test 2: Authenticate user with dev-mock-token (simulating Google Sign-In)
  let authToken = "";
  let authenticatedUser = null;
  try {
    const res2 = await fetch(`${baseUrl}/api/auth/google/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken: "dev-mock-token:sardor_rahimov@thegogetters.uz",
        deviceName: "Google Pixel 8 Pro",
        platform: "android",
      }),
    });
    const json2 = await res2.json();
    console.log(`✓ Test 2: Mobile Google Auth Verify - Status: ${res2.status}, Success: ${json2.success}`);
    if (res2.status !== 200 || !json2.success || !json2.data?.token) {
      throw new Error(`Test 2 failed: ${JSON.stringify(json2)}`);
    }

    authToken = json2.data.token;
    authenticatedUser = json2.data.user;
    console.log(`   - User: ${authenticatedUser.name} (${authenticatedUser.handle})`);
    console.log(`   - JWT Token issued: ${authToken.slice(0, 30)}...`);
  } catch (err) {
    console.error("Test 2 Error:", err);
    process.exit(1);
  }

  // Test 3: Verify authenticated session using Bearer token (Simulating Mobile API Client)
  try {
    const res3 = await fetch(`${baseUrl}/api/auth/session`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
      },
    });
    const json3 = await res3.json();
    console.log(`✓ Test 3: Session check with Bearer token - Status: ${res3.status}, IsAuthenticated: ${json3?.data?.isAuthenticated}`);
    if (res3.status !== 200 || !json3?.data?.isAuthenticated || json3?.data?.user?.handle !== authenticatedUser.handle) {
      throw new Error(`Test 3 failed: ${JSON.stringify(json3)}`);
    }
    console.log(`   - Authenticated User confirmed: ${json3.data.user.name}`);
  } catch (err) {
    console.error("Test 3 Error:", err);
    process.exit(1);
  }

  // Test 4: Create a post using the Bearer token (Testing Auth Guard across domain routes)
  try {
    const res4 = await fetch(`${baseUrl}/api/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: "Mobil autentifikatsiya poydevori muvaffaqiyatli sinovdan o'tdi!",
        content: "<p>The Go-getters React Native mobil ilovasi uchun JWT Bearer token arxitekturasi to'liq ishga tushirildi.</p>",
        postType: "thought",
      }),
    });
    const json4 = await res4.json();
    console.log(`✓ Test 4: Protected API action with Bearer token - Status: ${res4.status}, Success: ${json4.success}`);
    if (res4.status !== 201 || !json4.success) {
      throw new Error(`Test 4 failed: ${JSON.stringify(json4)}`);
    }
    console.log(`   - Created Post ID: ${json4.data.id}`);
  } catch (err) {
    console.error("Test 4 Error:", err);
    process.exit(1);
  }

  // Test 5: Verify unauthenticated request rejection on protected route
  try {
    const res5 = await fetch(`${baseUrl}/api/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Bu xabar rad etilishi kerak",
      }),
    });
    const json5 = await res5.json();
    console.log(`✓ Test 5: Unauthorized request rejection - Status: ${res5.status}, Code: ${json5?.error?.code}`);
    if (res5.status !== 401) {
      throw new Error(`Test 5 failed: Expected 401 Unauthorized, got ${res5.status}`);
    }
  } catch (err) {
    console.error("Test 5 Error:", err);
    process.exit(1);
  }

  console.log("\n========================================================");
  console.log("ALL 5 VERTICAL SLICE #1 AUTH INTEGRATION TESTS PASSED 100%!");
  console.log("========================================================\n");
}

runAuthTests();
