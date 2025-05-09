require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // Optional if serving static frontend

// Environment variables
const brevoApiKey = process.env.BREVO_API_KEY;
const brevoListId = process.env.BREVO_LIST_ID || 3;
const websiteUrl = process.env.WEBSITE_URL || "https://baptist-church-onitiri.vercel.app/contact.html";

// Subscription endpoint
app.post("/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    // Check if already subscribed
    const check = await axios.get(`https://api.brevo.com/v3/contacts/${email}`, {
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json"
      }
    });

    if (check.data?.email) {
      return res.status(400).json({ message: "You’ve already subscribed!" });
    }
  } catch (err) {
    if (err.response && err.response.status !== 404) {
      console.error("Check failed:", err.response?.data || err.message);
      return res.status(500).json({ message: "Something went wrong while checking." });
    }
    // Else: 404 is okay → not yet subscribed
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

    // Send confirmation email
    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: {
        name: "BAPTIST CHURCH ONITIRI",
        email: "kehindevictor071@gmail.com"
      },
      to: [{ email }],
      subject: "You're Subscribed!",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; text-align: center;">
            <h2 style="color: #4CAF50;">GOD BLESS YOU!</h2>
            <p>Thank you for subscribing to our announcement community. Stay tuned for updates from <strong>Baptist Church Onitiri</strong>.</p>
            <br>
            <p style="font-size: 14px; color: #555;">
              •⁠ With Love, <strong>Baptist Church Onitiri</strong>
            </p>
            <p style="font-size: 12px; color: #777;">
              Baptist Church Onitiri ©️ 2025
            </p>
            <p style="font-size: 14px;">
              Click <a href="${websiteUrl}" style="color: #4CAF50; text-decoration: none;">here</a> to visit our site and complete your subscription.
            </p>
          </div>


      `
    }, {
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json"
      }
    });

    res.status(200).json({ message: "Subscription successful. Please check your email for confirmation." });
  } catch (err) {
    console.error("Final subscription error:", err.response?.data || err.message);
    res.status(500).json({ message: "Subscription failed. Please try again." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
