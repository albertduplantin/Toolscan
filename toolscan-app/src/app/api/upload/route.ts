import { NextResponse } from 'next/server';
import { getCurrentDbUser } from '@/lib/clerk/utils';
import { UTApi } from 'uploadthing/server';

export async function POST(request: Request) {
  try {
    console.log('[Upload API] Request received');
    const currentUser = await getCurrentDbUser();
    console.log('[Upload API] Current user:', currentUser?.id, currentUser?.email);

    if (!currentUser || !currentUser.tenantId) {
      console.error('[Upload API] User not authenticated or no tenant');
      return NextResponse.json(
        { error: 'User not authenticated or no tenant' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const cabinetId = formData.get('cabinetId') as string;
    const imageType = formData.get('imageType') as string; // 'empty' or 'full'

    console.log('[Upload API] Form data:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      cabinetId,
      imageType
    });

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
    console.log('[Upload API] Initializing UTApi...');
    const utapi = new UTApi({
      token: process.env.UPLOADTHING_TOKEN,
    });

    // Upload to Uploadthing using UTApi
    // uploadFiles expects an array and returns an array
    console.log('[Upload API] Uploading to Uploadthing...');
    const response = await utapi.uploadFiles([file]);
    console.log('[Upload API] Uploadthing response:', JSON.stringify(response, null, 2));

    // Check if upload was successful
    if (!response || response.length === 0) {
      console.error('[Upload API] No response from Uploadthing');
      throw new Error('Upload failed: No response from Uploadthing');
    }

    const uploadResult = response[0];

    if (!uploadResult.data) {
      const errorMessage = uploadResult.error?.message || 'Unknown error';
      console.error('[Upload API] Upload failed:', errorMessage);
      throw new Error(`Upload failed: ${errorMessage}`);
    }

    // Get the file URL (using any to bypass deprecation warning for now)
    const fileUrl = (uploadResult.data as any).url;
    console.log('[Upload API] Upload successful, URL:', fileUrl);
    console.log('[Upload API] Full upload result data:', uploadResult.data);
    // Return public URL
    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error('[Upload API] Error uploading file:', error);
    console.error('[Upload API] Error stack:', (error as Error).stack);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
