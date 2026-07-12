const dns = require("node:dns");
dns.setServers(["1.1.1.1", "1.0.0.1"]);

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";

dotenv.config();

const app = express();
const PORT = 5000;
app.use(cors());

app.use(express.json());

// MongoDB URI
const uri = process.env.MONGODB_URI as string;

if (!uri) {
  throw new Error("MONGODB_URI is missing in .env file");
}

// MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Database Connection
async function connectDB() {
  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });

    console.log(" Connected to MongoDB");

    const db = client.db("books");
    const booksCollection = db.collection("books");

    // books get
    // app.get("/books", async (req, res) => {
    //   const result = await booksCollection.find().toArray();
    //   res.send(result);
    // });

    // books details
    app.get("/books/:id", async (req, res) => {
      const id = req.params.id;
      const result = await booksCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // scrach implement and get books:
    app.get("/books", async (req, res) => {
      const { search, category, price } = req.query;

      const query: Record<string, any> = {};

      if (search) {
        query.title = {
          $regex: search,
          $options: "i",
        };
      }

      if (category) {
        query.category = category;
      }

      let cursor = booksCollection.find(query);

      if (price === "low-high") {
        cursor = cursor.sort({ price: 1 });
      }

      if (price === "high-low") {
        cursor = cursor.sort({ price: -1 });
      }

      const result = await cursor.toArray();

      res.send(result);
    });

    // add Book
    app.post("/books", async (req, res) => {
      const book = req.body;

      const result = await booksCollection.insertOne(book);

      res.send(result);
    });
    // manage book
    // delete book
    // manage book
    // delete book
    app.delete("/books/:id", async (req, res) => {
      const { id } = req.params;

      const result = await booksCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // edit or update
    app.put("/books/:id", async (req, res) => {
      const { id } = req.params;
      const updatedBook = req.body;

      const query = {
        _id: new ObjectId(id),
      };

      const updateDoc = {
        $set: {
          title: updatedBook.title,
          author: updatedBook.author,
          image: updatedBook.image,
          category: updatedBook.category,
          rating: updatedBook.rating,
          copies: updatedBook.copies,
          description: updatedBook.description,
          publishedYear: updatedBook.publishedYear,
          price: updatedBook.price,
        },
      };

      const result = await booksCollection.updateOne(query, updateDoc);

      res.send(result);
    });

    console.log(" Test document inserted");
  } catch (error) {
    console.error(" MongoDB Connection Error:", error);
    process.exit(1);
  }
}

// Start Server
async function startServer() {
  await connectDB();

  app.get("/", (req, res) => {
    res.send("Server is running...");
  });

  app.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
  });
}

startServer();

export default client;
