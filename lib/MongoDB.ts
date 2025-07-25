import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";

// Ensure the MONGODB_URI environment variable is defined
if (!process.env.Fluxx_MongodDB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

const uri = process.env.Fluxx_MongodDB_URI;
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient>;

// MongoDB connection handling
if (process.env.NODE_ENV === "development") {
  if (!global._mongoClient) {
    client = new MongoClient(uri);
    global._mongoClient = client;
  } else {
    client = global._mongoClient;
  }
  clientPromise = client.connect();
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// Export the promise to be used for database connections
export default clientPromise;

// Connect to the database
export async function connectToDatabase() {
  const client = await clientPromise;
  return client.db("fluxx");
}

// Register a new user
export async function registerUser(
  { 
    Email, 
    Password, 
    Role, 
    Department, 
    Firstname, 
    Lastname,
    ReferenceID
  }: { 
    Email: string; 
    Password: string;
    Role: string;
    Department: string;
    Firstname: string;
    Lastname: string;
    ReferenceID: string;
  }) {
  const db = await connectToDatabase();
  const usersCollection = db.collection("users");

  // Check if the email already exists in the database
  const existingUser = await usersCollection.findOne({ Email });
  if (existingUser) {
    return { success: false, message: "Email already in use" };
  }

  // Hash the password before saving it to the database
  const hashedPassword = await bcrypt.hash(Password, 10);

  // Insert the new user into the collection
  await usersCollection.insertOne({
    Email,
    Role,
    Department,
    Firstname,
    Lastname,
    ReferenceID,
    Password: hashedPassword,
    createdAt: new Date(),
  });

  return { success: true };
}

// Validate user credentials
export async function validateUser({ Email, Password, Department,}: { Email: string; Password: string; Department: string;}) {
  const db = await connectToDatabase();
  const usersCollection = db.collection("users");

  // Find the user by email
  const user = await usersCollection.findOne({ Email });
  if (!user) {
    return { success: false, message: "Invalid email or password" };
  }

  // Compare the provided password with the stored hashed password
  const isValidPassword = await bcrypt.compare(Password, user.Password);
  if (!isValidPassword) {
    return { success: false, message: "Invalid email or password" };
  }

  return { success: true, user }; // Return the user object along with success status
}


