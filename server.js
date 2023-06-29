 
 

const express = require("express");
const multer = require('multer');
const admin = require("firebase-admin");
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { getDownloadURL, ref } = require('firebase/storage');
const cors = require('cors');
require('dotenv').config();
var serviceAccount = require("./config.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "fileshraingapp.appspot.com",
    // databaseURL: "https://console.firebase.google.com/u/0/project/fileshraingapp/firestore/data/~2FUser~2Fha2pnZOOrtd9LWyl33Of"
  });
 
const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const db = admin.firestore();
const filesCollection = db.collection("files");
const storageRef = admin.storage().bucket();

const bucket = admin.storage().bucket();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
 
app.get("/gallery", async (req, res) => {
  try {
    const files = [];
    const [filesResponse] = await storageRef.getFiles({ prefix: 'files/' });

    if (filesResponse[0].name === "files/") {
      filesResponse.shift(); // Remove the first file
    }

    for (const file of filesResponse) {
      const [metadata] = await file.getMetadata();
      const downloadURL = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2500' // Adjust the expiry date as needed
      });

      // console.log(metadata.name, downloadURL[0]);

      files.push({
        filename: metadata.name,
        downloadURL: downloadURL[0]
      });
    }
    res.send(files); // Send the dynamically generated HTML content as the response
  } catch (error) {
    console.error("Error fetching image URLs:", error);
    res.status(500).send("Internal Server Error");
  }
});


app.post('/add', upload.single('file'), async (req, res) => {
  try {
    const { filename, user, description, category } = req.body;
    const file = req.file;
    const augmentedCategory = category || "default" 
    console.log(augmentedCategory, category)
     
    // Generate a unique filename using UUID
    const uniqueFilename = `${`${filename}_${augmentedCategory}_${user}_${uuidv4()}`}_ `;

    // Upload the file to Firebase Storage
    const blob = bucket.file(`files/${uniqueFilename}`);
    const blobStream = blob.createWriteStream();

    blobStream.on('error', (err) => {
      console.error('Error uploading file:', err);
      return res.status(500).send('Internal Server Error');
    });

    blobStream.on('finish', async () => {
      // Get the download URL of the uploaded file
      const downloadURL = await blob.getSignedUrl({
        action: 'read',
        expires: '03-01-2500' // Adjust the expiry date as needed
      });
      
      return res.status(200).send(`File added successfully with URL: ${downloadURL}`);
    });

    blobStream.end(file.buffer);
  } catch (error) {
    console.error('Error adding file:', error);
    return res.status(500).send('Internal Server Error');
  }
});

  app.put('/update', async (req, res) => {
    try {
      const { user, filename, contents } = req.body;
  
      // Query the collection to find the file with matching username and filename
      const querySnapshot = await filesCollection
        .where('user', '==', user)
        .where('filename', '==', filename)
        .get();
  
      if (querySnapshot.empty) {
        return res.status(404).send('File not found');
      }
  
      // Update the contents of the first matching document
      const fileDoc = querySnapshot.docs[0];
      await fileDoc.ref.update({ contents });
  
      return res.status(200).send('File updated successfully');
    } catch (error) {
      console.error('Error updating file:', error);
      return res.status(500).send('Internal Server Error');
    }
  });

  app.delete('/delete', async (req, res) => {
    try {
      const { user, filename } = req.body;
      console.log(user, filename);
  
      // Find the document(s) matching the provided username and filename
      const querySnapshot = await filesCollection
        .where('user', '==', user)
        .where('filename', '==', filename)
        .get();
  
      // Check if any matching document(s) were found
      if (querySnapshot.empty) {
        return res.status(404).send('File not found');
      }
  
      // Delete the matching document(s)
      const deletePromises = querySnapshot.docs.map((doc) => doc.ref.delete());
      await Promise.all(deletePromises);
  
      return res.status(200).send('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      return res.status(500).send('Internal Server Error');
    }
  });
  
  async function listFiles() {
    try {
      const [files] = await admin.storage().bucket().getFiles({
        prefix: "files/"
      });
  
      console.log("Files in the folder:");
      files.forEach(file => {
        console.log(file.name);
      });
    } catch (error) {
      console.error("Error listing files:", error);
    }
  }  
  // Call the function to list files
  listFiles();

   const PORT = 5000 || process.env.PORT;//dont change this

   app.listen(PORT, ()=>{
    console.log(`Server is runnning on port https//localhost:${PORT}`)
   })


   // app.get("/", async (req, res) => {
//   try {
//     let response = [];

//     const querySnapshot = await filesCollection.get();
//     querySnapshot.forEach((doc) => {
//       response.push(doc.data());
//     });
//     return  res.sendFile('index.html', { root: './public' });
//     // return res.status(200).send(response);
//   } catch (error) {
//     return res.status(500).send(error);
//   }
// });