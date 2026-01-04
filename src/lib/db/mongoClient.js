// lib/db/mongoClient.js
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('Please add your MongoDB URI to .env.local');
}

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the connection across hot reloads
  if (!global._mongoClientPromise && MONGODB_URI) {
    client = new MongoClient(MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable
  if (MONGODB_URI) {
    client = new MongoClient(MONGODB_URI);
    clientPromise = client.connect();
  }
}

export default clientPromise;

// Export the DB name as well
export const DB_NAME = 'snailtype';