import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`✓ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.warn(`⚠️  MongoDB connection warning: ${error.message}`);
    console.warn('   Ensure MONGODB_URI is set in your .env file.');
    return null;
  }
}

export function getDatabaseConnection() {
  return mongoose.connection;
}

export default connectDB;
