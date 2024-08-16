const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

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
  'FIREBASE_CLIENT_X509_CERT_URL'
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
const PORT = process.env.PORT || 5000;

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the "public" directory
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle form submission
app.post('/create-ticket', async (req, res) => {
  const { clientName, clientNumber, location, houseNumber, problem, reportTime } = req.body;

  try {
    await db.collection('tickety').add({
      clientName,
      clientNumber,
      location,
      houseNumber,
      problem,
      reportTime: new Date(reportTime), // Ensure this is a date object
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.send('Ticket created successfully!');
  } catch (error) {
    console.error('Error adding ticket:', error);
    res.status(500).send('Error creating ticket');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
