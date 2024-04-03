import { MongoClient } from "mongodb";
let db;

async function connectToDB(cb){
    const client  = new MongoClient('mongodb://localhost:27017')
    await client.connect();

     db = client.db('react-blog-db'); // DB created already
     cb();
}

export {
    db,
    connectToDB,
};