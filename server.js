const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./authRoutes');
const app = express();
const port = 3002;

app.use(cors());
app.use(express.json()); // Middleware for parsing JSON

// Serve static files (images) from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mydatabase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB...', err));

// Use authentication routes
app.use('/api/auth', authRoutes);

// Other CRUD routes for products
// your existing product routes go here

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
