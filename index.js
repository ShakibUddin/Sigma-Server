const express = require("express");
const cors = require("cors");
const { MongoClient } = require('mongodb');
require('dotenv').config();
const ObjectId = require('mongodb').ObjectId;
const app = express();
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.SIGMA_FIREBASE_ADMIN_SDK);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const verifyToken = async (req, res, next) => {
    if (req.headers?.authorization?.startWith("Bearer ")) {
        const token = req.headers?.authorization.split(" ")[1];

        try {
            const decodedUser = await admin.auth().verifyToken(token);
            req.decodedEmail = decodedUser.email;
            console.log("decoded email ", decodedEmail);
        }
        catch {
            error => console.log(error);
        }
    }
    next();
}
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
        const productsCollection = database.collection('products');
        const usersCollection = database.collection('users');
        const reviewsCollection = database.collection('reviews');
        const purchasesCollection = database.collection('purchases');

        //---------------------Products Routes-----------------------------------------
        // GET  - get products data
        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray();
            res.send(products);
        });
        // POST - saving product in db
        app.post('/product/add', async (req, res) => {
            const data = req.body;
            const insertOperation = await productsCollection.insertOne(data);
            if (insertOperation.acknowledged) {
                res.send(true);
            }
            else {
                res.send(false);
            }
        });
        // DELETE  - delete a product
        app.delete('/product/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { "_id": ObjectId(id) };
            const deleteOperation = await productsCollection.deleteOne(query);
            if (deleteOperation.acknowledged) {
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
        //GET - get user role
        app.get('/user/role/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                res.send(user.role);
            }
            else {
                res.send("UNREGISTERED-USER");
            }
        });
        // PUT API - update a user role to admin
        app.put('/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const clientEmail = req.decodedEmail;
            console.log("decoded client email ", clientEmail);
            if (clientEmail) {
                const clientUser = await usersCollection.findOne({ email: clientEmail });
                console.log("decoded client ", clientUser);
                if (clientUser.role === "ADMIN") {
                    // create a filter for a user to update
                    const filter = { 'email': email };
                    const updateDoc = {
                        $set: {
                            role: "ADMIN"
                        },
                    };
                    const user = await usersCollection.findOne({ email: email });
                    //if user exists then update to admin
                    console.log(user)
                    if (user) {
                        const updateOperation = await usersCollection.updateOne(filter, updateDoc);
                        if (updateOperation.acknowledged) {
                            res.send(true);
                        }
                        else {
                            res.send(false);
                        }
                    }
                    else {
                        res.send(false);
                    }
                }
                else {
                    res.status(403).send("You are not admin");
                }
            }
            else {
                res.status(403).send("Unauthorized User");
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
        app.post('/review/add', async (req, res) => {
            const data = req.body;
            const insertOperation = await reviewsCollection.insertOne(data);
            if (insertOperation.acknowledged) {
                res.send(true);
            }
            else {
                res.send(false);
            }
        });

        //---------------------Purchase Routes-----------------------------------------
        // GET  - get purchases data
        app.get('/purchases', async (req, res) => {
            const cursor = purchasesCollection.find({});
            const purchases = await cursor.toArray();
            res.send(purchases);
        });
        // POST - saving purchase in db
        app.post('/purchase/add', async (req, res) => {
            const data = req.body;
            const insertOperation = await purchasesCollection.insertOne(data);
            if (insertOperation.acknowledged) {
                res.send(true);
            }
            else {
                res.send(false);
            }
        });
        // DELETE  - delete a purchase
        app.delete('/purchase/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const deleteOperation = await purchasesCollection.deleteOne(query);
            if (deleteOperation.acknowledged) {
                res.send(true);
            }
            else {
                res.send(false);
            }
        });
        // PUT API - update a purchase status
        app.put('/purchase/update/:id', async (req, res) => {
            // create a filter for a purchase to update
            const filter = { '_id': ObjectId(req.params.id) };
            // create a document that sets the approved value of purchase
            const updateDoc = {
                $set: {
                    status: "Shipped"
                },
            };
            const updateOperation = await purchasesCollection.updateOne(filter, updateDoc);
            if (updateOperation.acknowledged) {
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