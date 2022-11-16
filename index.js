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
  } finally {
  }
}
run().catch((error) => console.log(error));

app.listen(port, () =>
  console.log(`doctors server is running on port ${port}`)
);
