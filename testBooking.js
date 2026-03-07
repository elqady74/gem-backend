require("dotenv").config();
const axios = require("axios");
const jwt = require("jsonwebtoken");

/* =========================
   Config
========================= */
const BASE_URL = process.env.TEST_BASE_URL || "https://gem-backend-production.up.railway.app/api/bookings";
const dummyUserId = "60c72b2f9b1d8b00155b4a3a";
const token = jwt.sign(
    { id: dummyUserId, role: "user" },
    process.env.JWT_SECRET || "gem_secret_key",
    { expiresIn: "30d" }
);

const headers = { Authorization: `Bearer ${token}` };

let createdBookingId = null;

/* =========================
   Test Runner
========================= */
async function runTest(name, fn) {
    try {
        const result = await fn();
        console.log(`✅ ${name}`);
        if (result) console.log(`   →`, JSON.stringify(result, null, 2).split("\n").join("\n   → "));
        return result;
    } catch (error) {
        if (error.response) {
            console.log(`❌ ${name} — Status: ${error.response.status}`);
            console.log(`   →`, JSON.stringify(error.response.data));
        } else {
            console.log(`❌ ${name} — ${error.message}`);
        }
        return null;
    }
}

async function expectError(name, fn, expectedStatus) {
    try {
        await fn();
        console.log(`❌ ${name} — Expected error ${expectedStatus} but got success`);
    } catch (error) {
        if (error.response && error.response.status === expectedStatus) {
            console.log(`✅ ${name} — Got expected ${expectedStatus}: ${error.response.data.message}`);
        } else if (error.response) {
            console.log(`❌ ${name} — Expected ${expectedStatus}, got ${error.response.status}: ${error.response.data.message}`);
        } else {
            console.log(`❌ ${name} — Connection error: ${error.message}`);
        }
    }
}

/* =========================
   Tests
========================= */
async function testAll() {
    console.log("\n====================================");
    console.log("  Booking & Payment API Tests");
    console.log("  (Paymob Integration)");
    console.log("====================================\n");

    // --- 1. Validation Tests ---
    console.log("--- Validation Tests ---\n");

    await expectError(
        "Missing booking data (no body)",
        () => axios.post(`${BASE_URL}/checkout`, {}, { headers }),
        400
    );

    await expectError(
        "Invalid nationality type",
        () => axios.post(`${BASE_URL}/checkout`, {
            visitDate: "2026-12-01",
            nationalityType: "martian",
            tickets: [{ category: "adult", quantity: 1 }]
        }, { headers }),
        400
    );

    await expectError(
        "Invalid ticket category",
        () => axios.post(`${BASE_URL}/checkout`, {
            visitDate: "2026-12-01",
            nationalityType: "egyptian",
            tickets: [{ category: "vip", quantity: 1 }]
        }, { headers }),
        400
    );

    await expectError(
        "Invalid quantity (zero)",
        () => axios.post(`${BASE_URL}/checkout`, {
            visitDate: "2026-12-01",
            nationalityType: "egyptian",
            tickets: [{ category: "adult", quantity: 0 }]
        }, { headers }),
        400
    );

    await expectError(
        "Invalid quantity (negative)",
        () => axios.post(`${BASE_URL}/checkout`, {
            visitDate: "2026-12-01",
            nationalityType: "egyptian",
            tickets: [{ category: "adult", quantity: -2 }]
        }, { headers }),
        400
    );

    await expectError(
        "Invalid quantity (float)",
        () => axios.post(`${BASE_URL}/checkout`, {
            visitDate: "2026-12-01",
            nationalityType: "egyptian",
            tickets: [{ category: "adult", quantity: 1.5 }]
        }, { headers }),
        400
    );

    await expectError(
        "Past visit date",
        () => axios.post(`${BASE_URL}/checkout`, {
            visitDate: "2020-01-01",
            nationalityType: "egyptian",
            tickets: [{ category: "adult", quantity: 1 }]
        }, { headers }),
        400
    );

    await expectError(
        "Invalid date format",
        () => axios.post(`${BASE_URL}/checkout`, {
            visitDate: "not-a-date",
            nationalityType: "egyptian",
            tickets: [{ category: "adult", quantity: 1 }]
        }, { headers }),
        400
    );

    // --- 2. Successful Checkout ---
    console.log("\n--- Checkout Test ---\n");

    const checkoutResult = await runTest(
        "Successful checkout (egyptian: 2 adult + 1 student)",
        async () => {
            const res = await axios.post(`${BASE_URL}/checkout`, {
                visitDate: "2026-12-01",
                nationalityType: "egyptian",
                tickets: [
                    { category: "adult", quantity: 2 },
                    { category: "student", quantity: 1 }
                ],
                billingData: {
                    first_name: "Ahmed",
                    last_name: "Test",
                    email: "ahmed@test.com",
                    phone_number: "+201234567890"
                }
            }, { headers });

            createdBookingId = res.data.bookingId;

            return {
                bookingId: res.data.bookingId,
                subtotal: res.data.subtotal,
                tax: res.data.tax,
                total: res.data.total,
                currency: res.data.currency,
                paymobOrderId: res.data.paymobOrderId,
                hasPaymentKey: !!res.data.paymentKey,
                hasCheckoutUrl: !!res.data.checkoutUrl,
                checkoutUrl: res.data.checkoutUrl
            };
        }
    );

    // Verify price calculations
    if (checkoutResult) {
        const expectedSubtotal = (200 * 2) + (100 * 1); // 500
        const expectedTax = +(expectedSubtotal * 0.14).toFixed(2); // 70
        const expectedTotal = +(expectedSubtotal + expectedTax).toFixed(2); // 570

        console.log(`\n--- Price Verification ---\n`);
        console.log(`${checkoutResult.subtotal === expectedSubtotal ? "✅" : "❌"} Subtotal: ${checkoutResult.subtotal} (expected ${expectedSubtotal})`);
        console.log(`${checkoutResult.tax === expectedTax ? "✅" : "❌"} Tax (14%): ${checkoutResult.tax} (expected ${expectedTax})`);
        console.log(`${checkoutResult.total === expectedTotal ? "✅" : "❌"} Total: ${checkoutResult.total} (expected ${expectedTotal})`);
        console.log(`${checkoutResult.currency === "EGP" ? "✅" : "❌"} Currency: ${checkoutResult.currency} (expected EGP)`);
    }

    // --- 3. Get My Bookings ---
    console.log("\n--- My Bookings Test ---\n");

    await runTest(
        "Get my bookings",
        async () => {
            const res = await axios.get(`${BASE_URL}/my-bookings`, { headers });
            return { count: res.data.length, firstBookingId: res.data[0]?._id };
        }
    );

    // --- 4. Get Booking by ID ---
    if (createdBookingId) {
        console.log("\n--- Booking Details Test ---\n");

        await runTest(
            `Get booking by ID (${createdBookingId})`,
            async () => {
                const res = await axios.get(`${BASE_URL}/${createdBookingId}`, { headers });
                return {
                    id: res.data._id,
                    paymentStatus: res.data.paymentStatus,
                    nationalityType: res.data.nationalityType,
                    total: res.data.total,
                    paymobOrderId: res.data.paymobOrderId
                };
            }
        );
    }

    // --- 5. Verify Payment ---
    console.log("\n--- Verify Payment Test ---\n");

    await expectError(
        "Verify payment without orderId",
        () => axios.post(`${BASE_URL}/verify-payment`, {}, { headers }),
        400
    );

    // --- 6. Test without auth ---
    console.log("\n--- Auth Tests ---\n");

    await expectError(
        "Checkout without token",
        () => axios.post(`${BASE_URL}/checkout`, {
            visitDate: "2026-12-01",
            nationalityType: "egyptian",
            tickets: [{ category: "adult", quantity: 1 }]
        }),
        401
    );

    console.log("\n====================================");
    console.log("  Tests Complete!");
    console.log("====================================\n");
}

testAll();
