const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');
const axios = require('axios'); // For making HTTP requests
require('dotenv').config();
const qs = require('querystring');

// Ensure all required environment variables are present
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'FIREBASE_AUTH_URI',
  'FIREBASE_TOKEN_URI',
  'FIREBASE_AUTH_PROVIDER_X509_CERT_URL',
  'FIREBASE_CLIENT_X509_CERT_URL',
  'ZETTATEL_USERNAME',
  'ZETTATEL_PASSWORD',
  'ZETTATEL_SENDER_ID',
  'SMS_RECIPIENT_NUMBERS',
  'PORT'
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`Error: Missing environment variable ${envVar}`);
    process.exit(1);
  }
});

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://iconicfaiba-default-rtdb.europe-west1.firebasedatabase.app/" // Replace with your Firebase Realtime Database URL if needed
});

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3000; // Default port to 3000

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the "assets" directory
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Function to send SMS using Zettatel API
const sendSms = async (message) => {
  const apiUrl = 'https://portal.zettatel.com/SMSApi/send';
  const username = process.env.ZETTATEL_USERNAME;
  const password = process.env.ZETTATEL_PASSWORD;
  const senderId = process.env.ZETTATEL_SENDER_ID;
  const recipientNumbers = process.env.SMS_RECIPIENT_NUMBERS.split(','); // Use environment variable

  try {
    for (const recipientNumber of recipientNumbers) {
      const formattedNumber = recipientNumber.trim(); // Ensure there are no extra spaces

      // Prepare the request payload
      const requestData = qs.stringify({
        userid: username,
        password: encodeURIComponent(password), // URL encode the password
        sendMethod: 'quick',
        mobile: formattedNumber, // Mobile number with country code
        msg: message,
        senderid: senderId,
        msgType: 'text',
        duplicatecheck: 'true',
        output: 'json'
      });

      // Log the request data for debugging
      console.log(`Sending SMS to ${formattedNumber} with payload: ${requestData}`);

      // Send the request to Zettatel API
      const response = await axios.post(apiUrl, requestData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // Log the API response for debugging
      console.log(`Response from Zettatel API for ${formattedNumber}:`, response.data);
    }
    console.log('SMS sent successfully to all recipients');
  } catch (error) {
    // Detailed error logging
    console.error('Error sending SMS:', error.response ? error.response.data : error.message);
  }
};

// Handle form submission
app.post('/create-ticket', async (req, res) => {
  const { clientName, clientNumber, location, houseNumber, problem, reportTime } = req.body;

  // Validate input
  if (!clientName || !clientNumber || !location || !houseNumber || !problem || !reportTime) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Format reportTime
  let formattedReportTime;
  try {
    // Parse the reportTime to check validity and reformat it
    const date = new Date(reportTime);
    if (isNaN(date.getTime())) throw new Error('Invalid date format');
    formattedReportTime = date.toISOString().slice(0, 16); // Format to YYYY-MM-DDTHH:MM
  } catch (error) {
    return res.status(400).json({ message: 'Invalid reportTime format. Use YYYY-MM-DDTHH:MM' });
  }

  try {
    // Add ticket to Firestore
    await db.collection('tickets').add({
      clientName,
      clientNumber,
      location,
      houseNumber,
      problem,
      reportTime: formattedReportTime, // Save the formatted string
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send SMS notification
    const smsMessage = `New ticket created:\nClient Name: ${clientName}\nClient Number: ${clientNumber}\nLocation: ${location}\nHouse Number: ${houseNumber}\nProblem: ${problem}\nReport Time: ${formattedReportTime}`;
    await sendSms(smsMessage);

    // Send JSON response on success
    res.status(200).json({ message: 'Ticket created and SMS sent successfully!' });
  } catch (error) {
    console.error('Error adding ticket:', error);
    // Send JSON response on error
    res.status(500).json({ message: 'Error creating ticket' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
