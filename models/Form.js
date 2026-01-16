const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    place: {
        type: String,
        required: true,
        trim: true
    },
    qualification: {
        type: String,
        required: true,
        enum: ['ليسانس', 'بكالريوس', 'دبلوم', 'معاش', 'اخرى']
    },
    governorate: {
        type: String,
        required: true,
        trim: true
    },
    administration: {
        type: String,
        required: true,
        trim: true
    },
    school: {
        type: String,
        trim: true
    },
    idPhotoKeys: {
        type: String
    },
    comments: {
        type: String,
        trim: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Form', formSchema);
