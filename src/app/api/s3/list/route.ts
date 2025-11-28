// app/api/s3/list/route.ts
import { NextResponse } from "next/server";
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  region: "auto",
  signatureVersion: "v4",
  s3ForcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    const bucket = process.env.R2_BUCKET!;
    const data = await s3.listObjectsV2({ Bucket: bucket }).promise();

    const files = await Promise.all(
      (data.Contents || []).map(async (item) => {
        const downloadUrl = s3.getSignedUrl("getObject", {
          Bucket: bucket,
          Key: item.Key!,
          Expires: 60 * 10,
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
