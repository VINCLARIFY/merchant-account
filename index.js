// index.js
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch"); // Node-fetch v2
const cors = require("cors");
require("dotenv").config();

const app = express();

// ---- CORS Fix ----
// Allow only your frontend domain
app.use(cors({
  origin: "https://vinclarify.info",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Root route
app.get("/", (req, res) => {
  res.send("✅ Backend is running with CORS enabled!");
});

// Payment route
app.post("/process-payment", async (req, res) => {
  try {
    const { card_number, expiry, cvv, amount } = req.body;

    if (!card_number || !expiry || !cvv || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // expiry ko MMYY format me bhejna hota hai
    const exp = expiry.replace("/", "");

    // Payload for NMI
    const payload = new URLSearchParams({
      username: process.env.CLIENT_ID,     // Client ID
      security_key: process.env.API_KEY,   // API Key
      type: "sale",
      amount: amount,
      ccnumber: card_number,
      ccexp: exp,
      cvv: cvv
    });

    // API call to NMI
    const response = await fetch(
      "https://secure.networkmerchants.com/api/transact.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload
      }
    );

    const text = await response.text();

    // Parse response
    const result = {};
    text.split("&").forEach(part => {
      const [key, value] = part.split("=");
      result[key] = value;
    });

    res.json({
      status: result.response === "1" ? "APPROVED" : "DECLINED",
      message: result.responsetext,
      transaction_id: result.transactionid,
      raw: result
    });

  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({ error: "Payment processing failed" });
  }
});

// Optional: Test endpoint
app.post("/test", (req, res) => {
  res.json({ status: "OK", message: "Backend working with CORS!" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
