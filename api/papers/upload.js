const connectDB = require('../config/db');
const Paper = require('../models/Paper');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images allowed.'));
    }
  },
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await new Promise((resolve, reject) => {
      upload.single('file')(req, res, (err) => {
        if (err) reject(err);
        resolve();
      });
    });

    const { subject, title, uploaderEmail, uploaderName, year, semester, paperType } = req.body;

    if (!subject || !title || !uploaderEmail || !uploaderName || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subject, title, uploaderEmail, uploaderName, file',
      });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

    await connectDB();

    const newPaper = await Paper.create({
      subject: subject.trim(),
      title: title.trim(),
      uploaderEmail: uploaderEmail.trim(),
      uploaderName: uploaderName.trim(),
      imageUrl: imageDataUrl,
      fileSize: req.file.size,
      year: parseInt(year) || new Date().getFullYear(),
      semester: semester || 'odd',
      paperType: paperType || 'other',
      status: 'pending',
      uploadedDate: new Date(),
    });

    return res.status(201).json({
      success: true,
      paperId: newPaper._id,
      message: 'Paper uploaded successfully. Awaiting CR approval.',
      paper: {
        id: newPaper._id,
        subject: newPaper.subject,
        title: newPaper.title,
        status: newPaper.status,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error uploading paper',
    });
  }
}
