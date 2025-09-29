import { api } from './api';

interface UploadSignatureRequest {
  folder: string;
  resource_type?: string;
  tags?: string[];
  context?: Record<string, string>;
}

interface UploadSignatureResponse {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  upload_url: string;
  expires_at: number;
}

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  resource_type: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  tags: string[];
  folder: string;
  created_at: string;
}

interface UploadOptions {
  postType: 'recipe' | 'question';
  tags?: string[];
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: CloudinaryUploadResult) => void;
}

class CloudinaryUploadService {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  async uploadImage(
    imageUri: string,
    options: UploadOptions
  ): Promise<CloudinaryUploadResult> {
    const { postType, tags = [], onProgress, onError, onComplete } = options;

    try {
      // Step 1: Request upload signature from backend
      const signatureResponse = await this.getUploadSignature({
        folder: `yacook/community/${postType}`,
        resource_type: 'image',
        tags: [...tags, postType],
        context: {
          post_type: postType,
          upload_timestamp: Date.now().toString()
        }
      });

      // Step 2: Prepare form data for Cloudinary upload
      const formData = this.createFormData(imageUri, signatureResponse, {
        folder: `yacook/community/${postType}`,
        tags: [...tags, postType],
        context: {
          post_type: postType
        }
      });

      // Step 3: Upload to Cloudinary with progress tracking
      const uploadResult = await this.performUpload(
        signatureResponse.upload_url,
        formData,
        onProgress
      );

      // Step 4: Process successful upload
      if (onComplete) {
        onComplete(uploadResult);
      }

      return uploadResult;

    } catch (error) {
      console.error('Upload failed:', error);
      
      if (onError) {
        onError(error as Error);
      }
      
      throw new Error(`Upload failed: ${(error as Error).message}`);
    }
  }

  private async getUploadSignature(params: UploadSignatureRequest): Promise<UploadSignatureResponse> {
    try {
      const response = await api.post('/media/signature', params);
      
      if (response.data && response.data.signature) {
        return response.data;
      } else {
        throw new Error('Invalid signature response format');
      }
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.detail?.errors 
          ? error.response.data.detail.errors.join(', ')
          : 'Signature request failed';
        throw new Error(`Signature request failed: ${errorMessage}`);
      } else if (error.request) {
        throw new Error('Network error: Unable to reach signature server');
      } else {
        throw new Error(`Signature generation error: ${error.message}`);
      }
    }
  }

  private createFormData(
    imageUri: string, 
    signatureData: UploadSignatureResponse,
    uploadParams: any
  ): FormData {
    const formData = new FormData();
    
    // Add the image file
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
    } as any);

    // Add signed parameters
    formData.append('signature', signatureData.signature);
    formData.append('timestamp', signatureData.timestamp.toString());
    formData.append('api_key', signatureData.api_key);
    
    // Add upload parameters
    if (uploadParams.folder) {
      formData.append('folder', uploadParams.folder);
    }
    
    if (uploadParams.tags && uploadParams.tags.length > 0) {
      formData.append('tags', uploadParams.tags.join(','));
    }
    
    if (uploadParams.context) {
      const contextString = Object.entries(uploadParams.context)
        .map(([k, v]) => `${k}=${v}`)
        .join('|');
      formData.append('context', contextString);
    }

    return formData;
  }

  private async performUpload(
    uploadUrl: string, 
    formData: FormData, 
    onProgress?: (progress: number) => void
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Set timeout protection
      xhr.timeout = 30000; // 30 seconds
      
      // Configure progress tracking
      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(Math.round(percentComplete));
          }
        };
      }
      
      // Handle successful upload
      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (parseError) {
            reject(new Error('Invalid response format from upload server'));
          }
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      };
      
      // Handle upload errors
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.ontimeout = () => reject(new Error('Upload timeout - please try again'));
      
      // Execute upload
      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });
  }

  async uploadWithRetry(
    imageUri: string,
    options: UploadOptions
  ): Promise<CloudinaryUploadResult> {
    let retryCount = 0;
    let lastError: Error;
    
    while (retryCount < this.maxRetries) {
      try {
        return await this.uploadImage(imageUri, options);
      } catch (error) {
        lastError = error as Error;
        retryCount++;
        
        // Don't retry for certain types of errors
        if (this.isNonRetryableError(error as Error)) {
          throw error;
        }
        
        if (retryCount < this.maxRetries) {
          // Wait before retry
          await new Promise(resolve => 
            setTimeout(resolve, this.retryDelay * retryCount)
          );
        }
      }
    }
    
    throw lastError!;
  }

  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('invalid signature') ||
      message.includes('unauthorized') ||
      message.includes('validation') ||
      message.includes('authentication')
    );
  }
}

// Create and export service instance
export const cloudinaryService = new CloudinaryUploadService();

// Export convenience function
export const uploadImageToCloudinary = (
  imageUri: string,
  options: UploadOptions
): Promise<CloudinaryUploadResult> => {
  return cloudinaryService.uploadWithRetry(imageUri, options);
};