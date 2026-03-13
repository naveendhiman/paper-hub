const jwt = require('jsonwebtoken');
const connectDB = require('../config/db');
const Paper = require('../models/Paper');

function verifyToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  return jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
}

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

  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    let user;
    try {
      user = verifyToken(req);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: ' + error.message,
      });
    }

    const paperId = req.query.paperId || req.body.paperId;

    if (!paperId) {
      return res.status(400).json({
        success: false,
        message: 'paperId is required',
      });
    }

    await connectDB();

    const result = await Paper.findByIdAndDelete(paperId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Paper deleted permanently',
      deletedId: paperId,
    });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting paper',
    });
  }
}
