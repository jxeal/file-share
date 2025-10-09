// app/api/s3/presign/route.ts
import { NextResponse } from "next/server";
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    const { fileName, fileType } = await req.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "Missing fileName or fileType" },
        { status: 400 }
      );
    }

    const bucket = process.env.AWS_S3_BUCKET!;
    const key = `${fileName}-${Date.now()}`;

    const uploadUrl = s3.getSignedUrl("putObject", {
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
      Expires: 60 * 5, // 5 minutes
    });

    return NextResponse.json({ uploadUrl, key });
  } catch (err) {
    console.error("Presign error:", err);
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
