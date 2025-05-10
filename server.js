require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static frontend files

// Environment variables
const brevoApiKey = process.env.BREVO_API_KEY;
const brevoListId = process.env.BREVO_LIST_ID || 3;
const websiteUrl = process.env.WEBSITE_URL || "https://baptist-church-onitiri.vercel.app/confirmation-success.html";

// In-memory store for pending confirmations
const pendingConfirmations = new Map();

// Subscription endpoint
app.post("/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    // Generate a unique confirmation token
    const token = crypto.randomBytes(32).toString("hex");
    const expirationTime = Date.now() + 24 * 60 * 60 * 1000; // Token valid for 24 hours
    pendingConfirmations.set(token, { email, expiresAt: expirationTime });

    // Send confirmation email
    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: {
        name: "BAPTIST CHURCH ONITIRI",
        email: "kehindevictor071@gmail.com"
      },
      to: [{ email }],
      subject: "Confirm Your Subscription",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; text-align: center;">
            <h2 style="color: #4CAF50;">GOD BLESS YOU!</h2>
            <p>Thank you for subscribing to our announcement community. Please confirm your subscription by clicking the link below:</p>
            <br>
            <a href="${websiteUrl}/confirm?token=${token}" style="color: #4CAF50; text-decoration: none; font-size: 16px;">Confirm Subscription</a>
            <br><br>
            <p style="font-size: 14px; color: #555;">
              •⁠ With Love, <strong>Baptist Church Onitiri</strong>
            </p>
            <p style="font-size: 12px; color: #777;">
              Baptist Church Onitiri ©️ 2025
            </p>
          </div>
      `
    }, {
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json"
      }
    });

    res.status(200).json({ message: "Confirmation email sent. Please check your email to confirm your subscription." });
  } catch (err) {
    console.error("Error sending confirmation email:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to send confirmation email. Please try again." });
  }
});

// Confirmation endpoint
app.get("/confirm", async (req, res) => {
  const { token } = req.query;
  const confirmationData = pendingConfirmations.get(token);

  if (!confirmationData) {
    return res.redirect("https://baptist-church-onitiri.vercel.app/error.html"); // Redirect to error page if token is invalid
  }

  const { email, expiresAt } = confirmationData;

  // Check if the token has expired
  if (Date.now() > expiresAt) {
    pendingConfirmations.delete(token);
    return res.redirect("https://baptist-church-onitiri.vercel.app/error.html"); // Redirect to error page if token is expired
  }

  try {
    // Add to contact list
    await axios.post("https://api.brevo.com/v3/contacts", {
      email: email,
      listIds: [parseInt(brevoListId)],
      updateEnabled: true
    }, {
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json"
      }
    });

    // Remove the token from pending confirmations
    pendingConfirmations.delete(token);

    res.redirect("https://baptist-church-onitiri.vercel.app/confirmation-success.html"); // Redirect to success page
  } catch (err) {
    console.error("Error adding to contact list:", err.response?.data || err.message);
    res.redirect("https://baptist-church-onitiri.vercel.app/error.html"); // Redirect to error page if something goes wrong
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});