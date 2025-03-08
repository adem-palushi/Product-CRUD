const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router(); // Define the router
require('dotenv').config();
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('JWT_SECRET:', process.env.JWT_SECRET);

const app = express();
const port = 3002;

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

// User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

// Product Schema and Model
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  currency: String,
  stock: Number,
  category: String,
  sku: String,
  brand: String,
  status: String,
  image: String,
});
const Product = mongoose.model('Product', productSchema);

// Photo Schema and Model
const photoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  image: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});
const Photo = mongoose.model('Photo', photoSchema);

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    return cb(new Error('Only .jpg, .jpeg, or .png files are allowed.'));
  },
});

// Authentication Middleware
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).send({ message: 'Access denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).send({ message: 'Invalid token' });
  }
};

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = new User({ username, email, password: hashedPassword });

  try {
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error registering user', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});


// // Get all products
// app.get('/api/products', authenticate, async (req, res) => {
//   try {
//     const products = await Product.find();
//     res.status(200).send(products);
//   } catch (error) {
//     res.status(500).send({ message: 'Error fetching products', error: error.message });
//   }
// });


// Your routes go here
router.get('/products', async (req, res) => {
  const { search } = req.query;
  try {
    // If search query exists, filter the products accordingly
    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const products = await Product.find(query); // Find the products
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Using the router
app.use('/api', router); // The API route prefix


// Get a single product by ID
app.get('/api/products/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send({ message: 'Product not found' });
    res.status(200).send(product);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching product', error: error.message });
  }
});

// Create a new product
app.post('/api/products', authenticate, upload.single('image'), async (req, res) => {
  const { name, description, price, currency, stock, category, sku, brand, status } = req.body;
  const imageUrl = req.file ? `http://localhost:3002/uploads/${req.file.filename}` : null;

  const newProduct = new Product({
    name,
    description,
    price,
    currency,
    stock,
    category,
    sku,
    brand,
    status,
    image: imageUrl, // Save the image URL in the product object
  });

  try {
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).send({ message: 'Error creating product', error: error.message });
  }
});

// Update an existing product by ID
app.put('/api/products/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, currency, stock, category, sku, brand, status } = req.body;
    const imageUrl = req.file ? `http://localhost:3002/uploads/${req.file.filename}` : null;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price,
        currency,
        stock,
        category,
        sku,
        brand,
        status,
        image: imageUrl, // Update the image URL
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) return res.status(404).send({ message: 'Product not found' });

    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(400).send({ message: 'Error updating product', error: error.message });
  }
});

// Delete a product by ID
app.delete('/api/products/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).send({ message: 'Product not found' });
    res.status(200).send({ message: 'Product deleted!', product });
  } catch (error) {
    res.status(500).send({ message: 'Error deleting product', error: error.message });
  }
});

// Photo Management Routes
app.get('/api/photos', authenticate, async (req, res) => {
  try {
    const photos = await Photo.find();
    res.status(200).send(photos);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching photos', error: error.message });
  }
});

app.post('/api/photos', authenticate, upload.single('image'), async (req, res) => {
  const { title, description } = req.body;
  console.log('Title:', title); // Debugging
  console.log('File:', req.file); // Debugging

  const imageUrl = req.file ? `http://localhost:3002/uploads/${req.file.filename}` : null;

  const newPhoto = new Photo({ title, description, image: imageUrl });

  try {
    const savedPhoto = await newPhoto.save();
    res.status(201).json(savedPhoto);
  } catch (error) {
    res.status(400).send({ message: 'Error uploading photo', error: error.message });
  }
});

app.delete('/api/photos/:id', authenticate, async (req, res) => {
  try {
    console.log('Photo ID received for deletion:', req.params.id); // Debugging
    const photo = await Photo.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).send({ message: 'Photo not found' });

    res.status(200).send({ message: 'Photo deleted successfully!', photo });
  } catch (error) {
    res.status(500).send({ message: 'Error deleting photo', error: error.message });
  }
});

// General App Info
app.get('/api/info', (req, res) => {
  const appInfo = {
    name: 'Product Management App',
    email: 'example@example.com',
    phone: '+123456789',
    socialMedia: {
      instagram: '@example',
      facebook: 'ExamplePage',
    },
  };
  res.status(200).send(appInfo);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
