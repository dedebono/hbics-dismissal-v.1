const express = require('express');
const Student = require('../models/Student');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Configure multer for photo uploads
const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/students/';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const studentId = req.params.id;
      const extension = path.extname(file.originalname);
      const filename = `student_${studentId}${extension}`;
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed'));
    }
  }
});

// Configure multer for sound uploads
const soundUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/sounds/';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const studentId = req.params.id;
      const extension = path.extname(file.originalname);
      const filename = `student_${studentId}${extension}`;
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for sound files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|wav|ogg|m4a|aac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only sound files (mp3, wav, ogg, m4a, aac) are allowed'));
    }
  }
});

// Get all students
router.get('/', authenticateToken, (req, res) => {
  Student.getAll((err, students) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching students' });
    }
    res.json(students);
  });
});

// Get student by barcode
router.get('/barcode/:barcode', authenticateToken, (req, res) => {
  const { barcode } = req.params;

  Student.findByBarcode(barcode, (err, student) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching student' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  });
});

// Get student by ID
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  Student.findById(id, (err, student) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching student' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  });
});

// Create new student (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { barcode, name, class: className } = req.body;

  if (!barcode || !name || !className) {
    return res.status(400).json({ message: 'Barcode, name, and class are required' });
  }

  Student.create({ barcode, name, class: className }, (err, student) => {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ message: 'Barcode already exists' });
      }
      return res.status(500).json({ message: 'Error creating student' });
    }

    res.status(201).json({
      message: 'Student created successfully',
      student
    });
  });
});

// Update student (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { barcode, name, class: className } = req.body;

  if (!barcode || !name || !className) {
    return res.status(400).json({ message: 'Barcode, name, and class are required' });
  }

  Student.update(id, { barcode, name, class: className }, (err, result) => {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ message: 'Barcode already exists' });
      }
      return res.status(500).json({ message: 'Error updating student' });
    }

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ message: 'Student updated successfully' });
  });
});

// Delete student (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  Student.delete(id, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error deleting student' });
    }

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully' });
  });
});

// Get available classes
router.get('/classes/available', authenticateToken, (req, res) => {
  Student.getAvailableClasses((err, classes) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching classes' });
    }
    res.json(classes);
  });
});

// Get students by class
router.get('/class/:className', authenticateToken, (req, res) => {
  const { className } = req.params;

  Student.getByClass(className, (err, students) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching students' });
    }
    res.json(students);
  });
});

// Search students by name
router.get('/search/:name', authenticateToken, (req, res) => {
  const { name } = req.params;

  Student.searchByName(name, (err, students) => {
    if (err) {
      return res.status(500).json({ message: 'Error searching students' });
    }
    res.json(students);
  });
});

// Upload CSV file to create multiple students (admin only)
router.post('/upload-csv', authenticateToken, requireAdmin, upload.single('csvFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'CSV file is required' });
  }

  if (req.file.mimetype !== 'text/csv' && !req.file.originalname.endsWith('.csv')) {
    return res.status(400).json({ message: 'File must be a CSV' });
  }

  const results = [];
  const errors = [];
  let processedCount = 0;

  const stream = Readable.from(req.file.buffer.toString());
  
  stream
    .pipe(csv())
    .on('data', (data) => {
      // Validate CSV row
      const { barcode, name, class: className } = data;
      
      if (!barcode || !name || !className) {
        errors.push({
          row: processedCount + 1,
          error: 'Missing required fields (barcode, name, or class)',
          data
        });
        return;
      }

      // Add to processing queue
      results.push({ barcode, name, class: className });
    })
    .on('end', () => {
      if (results.length === 0) {
        return res.status(400).json({ 
          message: 'No valid student data found in CSV',
          errors 
        });
      }

      // Process all students
      const createdStudents = [];
      let completed = 0;

      results.forEach((studentData, index) => {
        Student.create(studentData, (err, student) => {
          processedCount++;
          
          if (err) {
            errors.push({
              row: index + 1,
              error: err.message.includes('UNIQUE constraint failed') 
                ? 'Barcode already exists' 
                : 'Database error',
              data: studentData
            });
          } else {
            createdStudents.push(student);
          }

          completed++;
          
          // When all processing is done
          if (completed === results.length) {
            res.status(201).json({
              message: 'CSV upload processed',
              created: createdStudents.length,
              failed: errors.length,
              total: results.length,
              createdStudents,
              errors
            });
          }
        });
      });
    })
    .on('error', (err) => {
      res.status(500).json({ 
        message: 'Error processing CSV file',
        error: err.message 
      });
    });
});

// Error handling middleware for photo upload
router.use('/:id/photo', (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB' });
    }
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

// Error handling middleware for sound upload
router.use('/:id/sound', (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB' });
    }
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

// Upload student photo (admin only)
router.post('/:id/photo', authenticateToken, requireAdmin, photoUpload.single('photo'), (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: 'Photo file is required' });
  }

  console.log('Photo upload received:', {
    studentId: id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    path: req.file.path
  });

  const backendUrl = process.env.BACKEND_URL;
  const photoUrl = `${backendUrl}/api/students/photo/${req.file.filename}`;

  // Update student with photo URL using the dedicated photo update method
  Student.updatePhoto(id, photoUrl, (err, result) => {
    if (err) {
      console.error('Database update error:', err);
      // Delete the uploaded file if database update fails
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ message: 'Error updating student photo', error: err.message });
    }

    if (result.changes === 0) {
      console.error('Student not found:', id);
      // Delete the uploaded file if student not found
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log('Photo uploaded successfully for student:', id);
    res.json({
      message: 'Photo uploaded successfully',
      photoUrl: photoUrl,
      filename: req.file.filename
    });
  });
});

// Serve student photos
router.get('/photo/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../uploads/students', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Photo not found' });
  }

  res.sendFile(filePath);
});

// Delete student photo (admin only)
router.delete('/:id/photo', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // First get the student to find the photo filename
  Student.findById(id, (err, student) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching student' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.photo_url) {
      return res.status(404).json({ message: 'No photo found for this student' });
    }

    // Extract filename from photo URL
    const filename = path.basename(student.photo_url);
    const filePath = path.join(__dirname, '../uploads/students', filename);

    // Delete the file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Update student to remove photo URL using the dedicated photo update method
    Student.updatePhoto(id, null, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error removing photo reference' });
      }

      res.json({ message: 'Photo deleted successfully' });
    });
  });
});

// Upload student sound (admin only)
router.post('/:id/sound', authenticateToken, requireAdmin, soundUpload.single('sound'), (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: 'Sound file is required' });
  }

  console.log('Sound upload received:', {
    studentId: id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    path: req.file.path
  });

  // Generate sound URL using BACKEND_URL environment variable or default to localhost
  const backendUrl = process.env.BACKEND_URL ;
  const soundUrl = `${backendUrl}/api/students/sound/${req.file.filename}`;

  // Update student with sound URL using the dedicated sound update method
  Student.updateSound(id, soundUrl, (err, result) => {
    if (err) {
      console.error('Database update error:', err);
      // Delete the uploaded file if database update fails
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ message: 'Error updating student sound', error: err.message });
    }

    if (result.changes === 0) {
      console.error('Student not found:', id);
      // Delete the uploaded file if student not found
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log('Sound uploaded successfully for student:', id);
    res.json({
      message: 'Sound uploaded successfully',
      soundUrl: soundUrl,
      filename: req.file.filename
    });
  });
});

// Serve student sounds
router.get('/sound/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../uploads/sounds', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Sound not found' });
  }

  res.sendFile(filePath);
});

// Delete student sound (admin only)
router.delete('/:id/sound', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // First get the student to find the sound filename
  Student.findById(id, (err, student) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching student' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.sound_url) {
      return res.status(404).json({ message: 'No sound found for this student' });
    }

    // Extract filename from sound URL
    const filename = path.basename(student.sound_url);
    const filePath = path.join(__dirname, '../uploads/sounds', filename);

    // Delete the file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Update student to remove sound URL using the dedicated sound update method
    Student.updateSound(id, null, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error removing sound reference' });
      }

      res.json({ message: 'Sound deleted successfully' });
    });
  });
});

module.exports = router;
