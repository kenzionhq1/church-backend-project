require("dotenv").config(); // Load environment variables
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Brevo API configuration
const brevoApiKey = process.env.BREVO_API_KEY;
const brevoListId = process.env.BREVO_LIST_ID || 3;
const websiteUrl = process.env.WEBSITE_URL || "http://localhost:5000";

// Subscribe route
app.post("/subscribe", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    // 1. Check if the email already exists in Brevo
    const checkResponse = await axios.get(
      `https://api.brevo.com/v3/contacts/${email}`,
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
        },
      }
    );

    if (checkResponse.data && checkResponse.data.email) {
      return res.status(400).json({ message: "Email already exists in our subscription list." });
    }
  } catch (error) {
    // If the error is a 404, it means the email does not exist, so we can proceed
    if (error.response && error.response.status !== 404) {
      console.error("Error checking email:", error.response?.data || error.message);
      return res.status(500).json({ message: "An error occurred while checking the email." });
    }
  }

  try {
    // 2. Add contact to Brevo
    await axios.post(
      "https://api.brevo.com/v3/contacts",
      {
        email: email,
        listIds: [parseInt(brevoListId)],
        updateEnabled: true,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
        },
      }
    );

    // 3. Send confirmation email
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "BAPTIST CHURCH ONITIRI",
          email: "kehindevictor071@gmail.com",
        },
        to: [{ email: email }],
        subject: "Subscription Confirmation",
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
        `,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
        },
      }
    );

    res.status(200).json({ message: "Subscription successful. Please check your email for confirmation." });
  } catch (error) {
    console.error("Subscription error:", error.response?.data || error.message);
    res.status(500).json({ message: "Subscription failed. Try again later." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});