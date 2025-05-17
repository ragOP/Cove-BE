const multer = require('multer');
const path = require('path');
const fs = require('fs');

const allowedFileTypes = {
  images: /jpeg|jpg|png|gif|webp|svg/,
  documents: /pdf|doc|docx|txt|rtf|odt|xlsx|xls|csv/,
  audio: /mp3|wav|ogg|mpeg|m4a|aac/,
  video: /mp4|avi|mov|wmv|flv|mkv|webm/,
  archives: /zip|rar|7z|tar|gz/
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = '';
    
    if (allowedFileTypes.images.test(file.mimetype)) {
      folder = 'images';
    } else if (allowedFileTypes.documents.test(file.mimetype)) {
      folder = 'documents';
    } else if (allowedFileTypes.audio.test(file.mimetype)) {
      folder = 'audio';
    } else if (allowedFileTypes.video.test(file.mimetype)) {
      folder = 'video';
    } else if (allowedFileTypes.archives.test(file.mimetype)) {
      folder = 'archives';
    } else {
      return cb(new Error('Invalid file type.'));
    }

    const uploadPath = path.join(__dirname, '../../uploads', folder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const uniqueFilename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`;
    cb(null, uniqueFilename);
  },
});

const fileFilter = (req, file, cb) => {
  const isValidType = Object.values(allowedFileTypes).some(regex => 
    regex.test(file.mimetype)
  );

  if (isValidType) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Supported types: images, documents, audio, video, and archives.'), false);
  }
};


const limits = {
  fileSize: 100 * 1024 * 1024, // 100MB max file size
  files: 10 // Maximum 10 files per request
};

module.exports = {
  storage,
  fileFilter,
  limits,
  allowedFileTypes
};
