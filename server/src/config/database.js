import mongoose from 'mongoose';

export async function connectDatabase() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not set. Add it to server/.env before starting the server.');
    }

    await mongoose.connect(uri);
    console.log('MongoDB connected');
}
