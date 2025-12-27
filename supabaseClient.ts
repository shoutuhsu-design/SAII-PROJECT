
import { createClient } from '@supabase/supabase-js';

// Security Best Practice: Use environment variables for API Keys.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://nfezefbvmhotjunenmuv.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZXplZmJ2bWhvdGp1bmVubXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1Mzg5OTQsImV4cCI6MjA4MTExNDk5NH0.eDJrb95q5IyXVoY957moIlbIre7VuSxg75bZoH3OaOk';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Uploads a file to Supabase Storage, handling bucket creation if missing.
 * Returns the path (filename) upon success.
 */
export const uploadFile = async (bucket: string, filename: string, blob: Blob): Promise<string> => {
    // 1. Try to upload directly
    let { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filename, blob, { upsert: true, contentType: blob.type });

    // 2. If upload failed, check why
    if (uploadError) {
        // If it looks like the bucket is missing, try to create it
        if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
            console.log(`Bucket '${bucket}' might be missing. Attempting to create...`);
            
            const { error: createError } = await supabase.storage.createBucket(bucket, {
                public: false, 
                allowedMimeTypes: ['image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/calendar', 'text/csv'],
                fileSizeLimit: 10485760 // 10MB
            });

            if (createError && !createError.message.includes('already exists')) {
                 console.error("Auto-creation of bucket failed:", createError);
            }
            
            // Retry upload after attempt to create
            const retry = await supabase.storage
                .from(bucket)
                .upload(filename, blob, { upsert: true, contentType: blob.type });
            
            if (retry.error) {
                if (retry.error.message.includes('violate') || retry.error.message.includes('security') || retry.error.message.includes('policy')) {
                    throw new Error("Permission Denied: Please run the SQL script to allow 'anon' uploads.");
                }
                throw retry.error;
            }
        } else if (uploadError.message.includes('violate') || uploadError.message.includes('security')) {
             throw new Error("Permission Denied (RLS): Database policy prevents upload. Check SQL.");
        } else {
            throw uploadError;
        }
    }
    return filename;
};

/**
 * Generates a signed URL for a file.
 * @param options.download - If true or string, forces Content-Disposition: attachment for downloading.
 */
export const getSignedUrl = async (bucket: string, filename: string, options: { download?: boolean | string } = {}): Promise<string> => {
    const { data: urlData, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filename, 60, {
            download: options.download // true or 'filename.ext' triggers download header
        });

    if (urlError || !urlData?.signedUrl) {
        throw new Error("Failed to generate download link.");
    }

    return urlData.signedUrl;
};

/**
 * Legacy Helper: Uploads and immediately returns a DOWNLOADABLE url.
 * Kept for backward compatibility with ImportModal.
 */
export const uploadAndGetDownloadUrl = async (bucket: string, filename: string, blob: Blob): Promise<string> => {
    await uploadFile(bucket, filename, blob);
    // Default to forcing download for compatibility
    return getSignedUrl(bucket, filename, { download: true });
};
