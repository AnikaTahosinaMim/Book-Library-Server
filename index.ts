const dns = require("node:dns");
dns.setServers(["1.1.1.1", "1.0.0.1"]);

import express, { NextFunction, Response, Request } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose-cjs";

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

// jwt
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);
const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(401).json({ msg: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ msg: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    // req.user = payload;
    console.log(payload);
    next();
  } catch (error) {
    console.log(error);
  }
};

// Database Connection
async function connectDB() {
  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });

    console.log(" Connected to MongoDB");

    const db = client.db("books");
    const booksCollection = db.collection("books");

    // books details
    app.get("/books/:id", async (req, res) => {
      const id = req.params.id;
      const result = await booksCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // scrach implement and get books:

    // add Book
    app.post("/books", verifyToken, async (req, res) => {
      const book = req.body;

      const result = await booksCollection.insertOne(book);

      res.send(result);
    });
    // manage book
    // delete book

    app.delete("/books/:id", verifyToken, async (req, res) => {
      const id = req.params.id as string;

      const result = await booksCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // edit or update
    app.put("/books/:id", verifyToken, async (req, res) => {
      const id = req.params.id as string;
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

    // pagination and filter
    // pagination and filter
    app.get("/books", async (req, res) => {
      const {
        search = "",
        category = "",
        price = "",
        page = 1,
        limit = 4,
      } = req.query;
      // if (category) {
      //   query.category = {
      //     $regex: `^${category}$`,
      //     $options: "i",
      //   };
      // }

      const query: Record<string, any> = {};

      if (search) {
        query.title = {
          $regex: search,
          $options: "i",
        };
      }
      if (category) {
        query.category = {
          $regex: `^${category}$`,
          $options: "i",
        };
      }
      console.log(req.query);
      console.log(category);
      console.log(query);

      const currentPage = Number(page);
      const perPage = Number(limit);

      const totalBooks = await booksCollection.countDocuments(query);

      let cursor = booksCollection
        .find(query)
        .skip((currentPage - 1) * perPage)
        .limit(perPage);

      if (price === "low-high") {
        cursor = cursor.sort({ price: 1 });
      } else if (price === "high-low") {
        cursor = cursor.sort({ price: -1 });
      }

      const books = await cursor.toArray();

      res.send({
        books,
        totalPages: Math.ceil(totalBooks / perPage),
        currentPage,
      });
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
