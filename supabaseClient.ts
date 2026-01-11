
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://nfezefbvmhotjunenmuv.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZXplZmJ2bWhvdGp1bmVubXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1Mzg5OTQsImV4cCI6MjA4MTExNDk5NH0.eDJrb95q5IyXVoY957moIlbIre7VuSxg75bZoH3OaOk';

export const supabase = createClient(supabaseUrl, supabaseKey);

// 仅保留基础存储助手，移除所有 functions.invoke 调用
export const uploadFile = async (bucket: string, filename: string, blob: Blob): Promise<string> => {
    let { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filename, blob, { upsert: true, contentType: blob.type });

    if (uploadError) {
        if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
            await supabase.storage.createBucket(bucket, { public: false });
            const retry = await supabase.storage.from(bucket).upload(filename, blob, { upsert: true, contentType: blob.type });
            if (retry.error) throw retry.error;
        } else {
            throw uploadError;
        }
    }
    return filename;
};

export const getSignedUrl = async (bucket: string, filename: string, options: { download?: boolean | string } = {}): Promise<string> => {
    const { data: urlData, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filename, 60, { download: options.download });

    if (urlError || !urlData?.signedUrl) throw new Error("Failed to generate download link.");
    return urlData.signedUrl;
};

export const uploadAndGetDownloadUrl = async (bucket: string, filename: string, blob: Blob): Promise<string> => {
    await uploadFile(bucket, filename, blob);
    return getSignedUrl(bucket, filename, { download: true });
};
