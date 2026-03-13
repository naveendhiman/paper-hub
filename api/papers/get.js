const connectDB = require('../config/db');
const Paper = require('../models/Paper');

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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { subject, status, year, semester, paperType, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (subject) {
      filter.subject = { $regex: subject, $options: 'i' };
    }

    if (status) {
      filter.status = status;
    } else {
      filter.status = 'approved';
    }

    if (year) {
      filter.year = parseInt(year);
    }

    if (semester) {
      filter.semester = semester;
    }

    if (paperType && paperType !== 'all') {
      filter.paperType = paperType;
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const papers = await Paper.find(filter)
      .sort({ uploadedDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Paper.countDocuments(filter);

    const transformedPapers = papers.map((paper) => ({
      id: paper._id,
      subject: paper.subject,
      title: paper.title,
      uploaderName: paper.uploaderName,
      uploadedDate: paper.uploadedDate,
      status: paper.status,
      imageUrl: paper.imageUrl,
      year: paper.year,
      semester: paper.semester,
      paperType: paper.paperType,
      approvedBy: paper.approvedBy,
    }));

    return res.status(200).json({
      success: true,
      papers: transformedPapers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      message: `Retrieved ${transformedPapers.length} papers`,
    });
  } catch (error) {
    console.error('Get papers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving papers',
    });
  }
}
