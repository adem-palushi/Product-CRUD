const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = 3001;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mydatabase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB...', err));

// Define Product Schema and Model
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  currency: String,
  stock: Number,
  category: String,
  sku: String,
  brand: String,
  status: String
});
const Product = mongoose.model('Product', productSchema);

// Middleware to parse JSON
app.use(express.json());

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).send(products);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching products', error });
  }
});

// GET product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send({ message: 'Product not found' });
    res.status(200).send(product);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching product', error });
  }
});

// POST create a new product
app.post('/api/products', async (req, res) => {
  const product = new Product({
    name: req.body.name,
    description: req.body.description,
    price: req.body.price,
    currency: req.body.currency,
    stock: req.body.stock,
    category: req.body.category,
    sku: req.body.sku,
    brand: req.body.brand,
    status: req.body.status
  });

  try {
    const result = await product.save();
    res.status(201).send({ message: 'Product created!', result });
  } catch (error) {
    res.status(400).send({ message: 'Error creating product', error });
  }
});

// PUT update a product by ID
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).send({ message: 'Product not found' });
    res.status(200).send({ message: 'Product updated!', product });
  } catch (error) {
    res.status(400).send({ message: 'Error updating product', error });
  }
});

// DELETE a product by ID
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).send({ message: 'Product not found' });
    res.status(200).send({ message: 'Product deleted!', product });
  } catch (error) {
    res.status(500).send({ message: 'Error deleting product', error });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
