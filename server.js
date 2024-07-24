const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'view')));

// MongoDB setup
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  dateOfBirth: Date
});

const User = mongoose.model('User', userSchema);

// Handle form submission
app.post('/submit', async (req, res) => {
  const { username, email, dateOfBirth } = req.body;

  const user = new User({
    username,
    email,
    dateOfBirth
  });

  try {
    await user.save();
    res.send('User data saved successfully!');
  } catch (err) {
    res.send('Error saving user data.');
  }
});

// 404 Error handler middleware
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, '404', '404.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// HTML email template for birthday wishes
const getBirthdayEmailTemplate = (username) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Happy Birthday!</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
        text-align: center;
      }
      .email-container {
        background-color: #fff;
        padding: 20px;
        margin: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }
      h1 {
        color: #333;
      }
      p {
        color: #666;
        font-size: 16px;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <h1>Happy Birthday, ${username}!</h1>
      <p>Wishing you a day filled with love, joy, and happiness. May all your dreams come true!</p>
      <p>Best Regards,</p>
      <p>Your Birthday Wisher App</p>
    </div>
  </body>
  </html>
`;

// Cron job to check for birthdays at 7am every day
cron.schedule('0 7 * * *', () => {
  const today = new Date().toISOString().slice(0, 10); // Get today's date in YYYY-MM-DD format

  User.find({ dateOfBirth: { $regex: `^${today}` } }, (err, users) => {
    if (err) {
      console.error('Error fetching users:', err);
    } else {
      users.forEach(user => {
        const mailOptions = {
          from: process.env.GMAIL_USER,
          to: user.email,
          subject: 'Happy Birthday!',
          html: getBirthdayEmailTemplate(user.username) // Use the HTML template
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            console.error('Error sending email:', err);
          } else {
            console.log('Email sent:', info.response);
          }
        });
      });
    }
  });
});
