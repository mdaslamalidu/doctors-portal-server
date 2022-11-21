const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
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

function veryJwt(req, res, next) {
  const authHeader = req.headers.authorizations;
  if (!authHeader) {
    return res.status(401).send("unauthorization access");
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const appointmentCollections = client
      .db("doctors-portal")
      .collection("appointmentOptions");
    const bookingsCollection = client
      .db("doctors-portal")
      .collection("bookings");
    const doctorsCollection = client.db("doctors-portal").collection("doctors");
    const usersCollection = client.db("doctors-portal").collection("users");

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const email = { email: decodedEmail };
      const user = await usersCollection.findOne(email);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/appointmentOption", async (req, res) => {
      const date = req.query.date;
      const query = {};
      const options = await appointmentCollections.find(query).toArray();
      const bookingQuery = { appointmentDate: date };
      const alreadyBooked = await bookingsCollection
        .find(bookingQuery)
        .toArray();
      options.forEach((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.treatmentName === option.name
        );
        const bookSlot = optionBooked.map((book) => book.slot);
        const remainingSlots = option.slots.filter(
          (slot) => !bookSlot.includes(slot)
        );
        option.slots = remainingSlots;
      });
      res.send(options);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const query = {
        appointmentDate: booking.appointmentDate,
        treatmentName: booking.treatmentName,
        email: booking.email,
      };

      const alreadyBooking = await bookingsCollection.find(query).toArray();

      if (alreadyBooking.length) {
        const message = `you have already booked on this date ${booking.appointmentDate}`;
        return res.send({
          acknowledged: false,
          message,
        });
      }

      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/bookings", veryJwt, async (req, res) => {
      const email = req.query.email;

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookingsCollection.findOne(query);
      res.send(result);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        return res.send({ accessToken: token });
      }
      return res.status(403).send({ accesToken: "" });
    });

    app.post("/users", async (req, res) => {
      const query = req.body;
      const result = await usersCollection.insertOne(query);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    app.put("/users/admin/:id", veryJwt, verifyAdmin, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = { email: decodedEmail };
      const user = await usersCollection.findOne(email);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const update = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc, update);
      res.send(result);
    });

    // app.get("/addPrice", async (req, res) => {
    //   const query = {};
    //   const update = { upsert: true };
    //   const updateDoc = {
    //     $set: {
    //       price: 99,
    //     },
    //   };
    //   const result = await appointmentCollections.updateMany(
    //     query,
    //     updateDoc,
    //     update
    //   );
    //   res.send(result);
    // });

    app.get("/appointmentSpeciality", async (req, res) => {
      const query = {};
      const result = await appointmentCollections
        .find(query)
        .project({ name: 1 })
        .toArray();
      res.send(result);
    });

    app.post("/doctors", veryJwt, verifyAdmin, async (req, res) => {
      const body = req.body;
      const result = await doctorsCollection.insertOne(body);
      res.send(result);
    });

    app.get("/doctors", veryJwt, verifyAdmin, async (req, res) => {
      const query = {};
      const result = await doctorsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/doctors/:id", veryJwt, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await doctorsCollection.deleteOne(filter);
      res.send(result);
    });
  } finally {
  }
}
run().catch((error) => console.log(error));

app.listen(port, () =>
  console.log(`doctors server is running on port ${port}`)
);
