require('dotenv').config();
const express = require('express');
const compression = require('compression');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Initialize App
const app = express();
const PORT = process.env.PORT || 3003;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Security Middleware
app.use(compression()); // Compress all responses
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for now to ensure styles load on all devices
})); // Set security headers
app.use(cors()); // Enable CORS
// app.use(mongoSanitize()); // Prevent NoSQL Injection

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'storage/uploads')));

// Data Folders
const DATA_DIR = path.join(__dirname, 'data');

// Auth Middleware
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Access Denied: No Token Provided' });
    }

    if (token !== process.env.ADMIN_TOKEN) {
        return res.status(403).json({ message: 'Access Denied: Invalid Token' });
    }

    next();
};

const Form = require('./models/Form.js');
const { Parser } = require('json2csv');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'storage/uploads/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// --- ROUTES ---

// 5. POST /api/submit
app.post('/api/submit', upload.single('idPhoto'), async (req, res) => {
    try {
        const { name, phoneNumber, qualification, place, governorate, administration, school, comments } = req.body;

        // Basic Server-side validations
        if (!name || !phoneNumber || !qualification || !place || !governorate || !administration) {
            return res.status(400).json({ message: 'All fields are required except School and Comments.' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'ID Photo is required.' });
        }

        const newForm = new Form({
            name,
            phoneNumber,
            qualification,
            place,
            governorate,
            administration,
            school, // Optional
            idPhotoKeys: req.file.path, // Store path
            comments
        });

        await newForm.save();
        res.status(201).json({ message: 'Form submitted successfully!' });

    } catch (error) {
        console.error('Submission Error:', error);
        res.status(500).json({ message: 'Server Error during submission.' });
    }
});

// 6. GET /api/forms [PROTECTED]
app.get('/api/forms', verifyToken, async (req, res) => {
    try {
        const forms = await Form.find().sort({ createdAt: -1 });
        res.json(forms);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching forms.' });
    }
});

// 7. GET /api/export [PROTECTED]
app.get('/api/export', verifyToken, async (req, res) => {
    try {
        const forms = await Form.find().sort({ createdAt: -1 });

        if (forms.length === 0) {
            return res.status(404).json({ message: 'No data to export.' });
        }

        const fields = ['name', 'phoneNumber', 'qualification', 'place', 'governorate', 'administration', 'school', 'idPhotoKeys', 'comments', 'createdAt'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(forms);

        res.header('Content-Type', 'text/csv');
        res.attachment('teachers_data.csv');
        return res.send(csv);

    } catch (error) {
        console.error('Export Error:', error);
        res.status(500).json({ message: 'Error exporting data.' });
    }
});

// 1. GET /api/places
app.get('/api/places', (req, res) => {
    const places = [
        "شبرا الخيمة", "شبرا مصر (الجنوبية)", "شبين القناطر", "عين شمس والمطرية وحلمية الزيتون",
        "حدائق القبة والوايلى والعباسية ومنشية الصدر", "عزبة النخل والمرج", "مدينة السلام والعبور",
        "شرق السكة الحديد", "حلوان والمعصرة", "المقطم", "مصر القديمة", "مدينة العبور", "مدينة بدر",
        "الجيزة (طموة وتوابعها)", "الجيزة (شمال الجيزة)", "الجيزة (وسط الجيزة)", "الجيزة (6 أكتوبر والشيخ زايد)",
        "البحيرة", "بنها", "المحلة", "طنطا", "المنصورة", "الشرقية والعاشر من رمضان", "الإسماعيلية",
        "ميت غمر", "كفر الشيخ دمياط البرارى", "المنوفية", "بورسعيد", "السويس", "مرسى مطروح",
        "الخمس مدن الغربية", "قطاع المنتزه الإسكندرية", "قطاع شرق الإسكندرية", "قطاع وسط الإسكندرية",
        "برج العرب والعامرية", "بنى سويف", "الفشن وببا وسمسطا", "مغاغة", "بنى مزار", "شرق المنيا",
        "أبو قرقاص", "مطاى", "سمالوط", "دير مواس ودلجه", "ملوى", "ديروط", "القوصية", "رزقة الدير",
        "منفلوط", "ابنوب والفتح", "ابوتيج", "الوادى الجديد", "طهطا", "طما", "سوهاج", "جرجا", "أخميم",
        "البلينا غرب وشرق", "نجع حمادى", "دشنا", "قنا", "البحر الاحمر", "قوص", "نقادة", "الأقصر",
        "اسنا", "اسوان"
    ];
    res.json(places);
});

// 2. GET /api/governorates
app.get('/api/governorates', (req, res) => {
    const filePath = path.join(DATA_DIR, 'governorates.json');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ message: 'Governorates data not found' });
    }
});

// 3. GET /api/administrations/:gov
app.get('/api/administrations/:gov', (req, res) => {
    const gov = req.params.gov;
    const filePath = path.join(DATA_DIR, gov, 'administrations.json');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ message: 'Administrations data not found for this governorate' });
    }
});

// 4. GET /api/schools/:gov/:admin
app.get('/api/schools/:gov/:admin', (req, res) => {
    const gov = req.params.gov;
    const admin = req.params.admin;
    const filePath = path.join(DATA_DIR, gov, admin, 'schools.json');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ message: 'Schools data not found for this administration' });
    }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'File too large. Max size is 10MB.' });
        }
        return res.status(400).json({ message: err.message });
    }
    console.error('Server Error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
