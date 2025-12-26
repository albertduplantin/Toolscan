import { NextResponse } from 'next/server';
import { getCurrentDbUser } from '@/lib/clerk/utils';
import { UTApi } from 'uploadthing/server';

const utapi = new UTApi();

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

    // Upload to Uploadthing using UTApi
    const uploadResult = await utapi.uploadFiles(file);

    if (!uploadResult.data) {
      throw new Error('Upload failed');
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
