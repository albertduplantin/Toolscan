import { NextResponse } from 'next/server';
import { getCurrentDbUser } from '@/lib/clerk/utils';
import { UTApi } from 'uploadthing/server';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentDbUser();

    if (!currentUser || !currentUser.tenantId) {
      return NextResponse.json(
        { error: 'User not authenticated or no tenant' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const cabinetId = formData.get('cabinetId') as string;
    const imageType = formData.get('imageType') as string; // 'empty' or 'full'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!cabinetId || !imageType) {
      return NextResponse.json(
        { error: 'Cabinet ID and image type are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 4MB for Uploadthing)
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 4MB' },
        { status: 400 }
      );
    }

    // Initialize UTApi with token from environment
    const utapi = new UTApi({
      token: process.env.UPLOADTHING_TOKEN,
    });

    // Upload to Uploadthing using UTApi
    // uploadFiles expects an array and returns an array
    const response = await utapi.uploadFiles([file]);

    // Check if upload was successful
    if (!response || response.length === 0) {
      throw new Error('Upload failed: No response from Uploadthing');
    }

    const uploadResult = response[0];

    if (!uploadResult.data) {
      const errorMessage = uploadResult.error?.message || 'Unknown error';
      throw new Error(`Upload failed: ${errorMessage}`);
    }

    // Return public URL
    return NextResponse.json({ url: uploadResult.data.url });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
