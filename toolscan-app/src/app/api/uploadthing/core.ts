import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { getCurrentDbUser } from '@/lib/clerk/utils';

const f = createUploadthing();

export const ourFileRouter = {
  cabinetImageUploader: f({ image: { maxFileSize: '4MB' } })
    .middleware(async () => {
      const user = await getCurrentDbUser();

      if (!user || !user.tenantId) {
        throw new Error('Unauthorized');
      }

      return { userId: user.id, tenantId: user.tenantId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Upload complete for userId:', metadata.userId);
      console.log('File URL:', file.url);

      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
