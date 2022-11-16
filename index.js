const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("doctors server is running");
});

// 6hALU9rHK6JHlmGE
// doctors-portal

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pfyym6a.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const appointmentCollections = client
      .db("doctors-portal")
      .collection("appointmentOptions");
    const bookingsCollection = client
      .db("doctors-portal")
      .collection("bookings");

    app.get("/appointmentOption", async (req, res) => {
      const query = {};
      const options = await appointmentCollections.find(query).toArray();
      res.send(options);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });
  } finally {
  }
}
run().catch((error) => console.log(error));

app.listen(port, () =>
  console.log(`doctors server is running on port ${port}`)
);
