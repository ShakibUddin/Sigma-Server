const express = require("express");
const cors = require("cors");
const { MongoClient } = require('mongodb');
require('dotenv').config();
const ObjectId = require('mongodb').ObjectId;
const app = express();

// middlewares
app.use(cors());
app.use(express.json());

//database url
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@main.vzl7z.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const port = process.env.PORT || 5000;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();
        const database = client.db(process.env.DB_NAME);
        const watchesCollection = database.collection('watches');
        const usersCollection = database.collection('users');
        const reviewsCollection = database.collection('reviews');

        //---------------------Watches Routes-----------------------------------------
        // GET  - get watches data
        app.get('/watches', async (req, res) => {
            const cursor = watchesCollection.find({});
            const watches = await cursor.toArray();
            res.send(watches);
        });

        // POST - saving product in db
        app.post('/product', async (req, res) => {
            const data = req.body;
            const insertOperation = await watchesCollection.insertOne(data);
            if (insertOperation.acknowledged) {
                res.send(true);
            }
            else {
                res.send(false);
            }
        });

        //---------------------User Routes-----------------------------------------
        //UPSERT - update user if exists or insert new
        app.put('/user', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const upsertOperation = await usersCollection.updateOne(filter, updateDoc, options);
            if (upsertOperation.acknowledged) {
                res.send(true);
            }
            else {
                res.send(false);
            }
        });

        //---------------------Review Routes-----------------------------------------
        // GET  - get reviews data
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        // POST - saving product in db
        app.post('/review', async (req, res) => {
            const data = req.body;
            const insertOperation = await reviewsCollection.insertOne(data);
            if (insertOperation.acknowledged) {
                res.send(true);
            }
            else {
                res.send(false);
            }
        });
    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log("listening to", port);
});