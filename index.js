const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://iconicfaiba-default-rtdb.europe-west1.firebasedatabase.app/" // Replace with your Firebase Realtime Database URL if needed
});

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle form submission
app.post('/create-ticket', (req, res) => {
  const { name, email, phone, location, date, issue, priority } = req.body;

  // Add the ticket data to Firebase Firestore
  db.collection('tickets').add({
    name: name,
    email: email,
    phone: phone,
    location: location,
    date: date,
    issue: issue,
    priority: priority,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    res.send('Ticket created successfully!');
  })
  .catch((error) => {
    console.error('Error adding ticket: ', error);
    res.status(500).send('Error creating ticket');
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
