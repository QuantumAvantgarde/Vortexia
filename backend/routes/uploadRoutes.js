// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');

// Endpoint: POST /api/upload/presigned-url
router.post('/presigned-url', async (req, res) => {
    try {
        const { fileName, fileType } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({ error: 'fileName and fileType are required' });
        }

        // Generate a unique file name using a timestamp to prevent overwriting files
        const uniqueKey = `uploads/${Date.now()}-${fileName}`;

        // Prepare the upload instruction
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: uniqueKey,
            ContentType: fileType,
        });

        // Generate a pre-signed URL valid for 5 minutes (300 seconds)
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        // Return the upload link and the permanent storage key
        res.json({
            uploadUrl,
            fileKey: uniqueKey,
            fileUrl: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueKey}`,
        });
    } catch (error) {
        console.error('Error generating pre-signed URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});

module.exports = router;