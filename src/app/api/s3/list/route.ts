// app/api/s3/list/route.ts
import { NextResponse } from "next/server";
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    const bucket = process.env.AWS_S3_BUCKET!;
    const data = await s3.listObjectsV2({ Bucket: bucket }).promise();

    const files = await Promise.all(
      (data.Contents || []).map(async (item) => {
        const downloadUrl = s3.getSignedUrl("getObject", {
          Bucket: bucket,
          Key: item.Key!,
          Expires: 300, // 5 minutes
        });

        return {
          key: item.Key,
          size: item.Size,
          lastModified: item.LastModified,
          downloadUrl,
        };
      })
    );

    return NextResponse.json(files);
  } catch (err) {
    console.error("List error:", err);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
