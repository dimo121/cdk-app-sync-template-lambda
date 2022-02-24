import { Effect, PolicyStatement } from "aws-cdk-lib/lib/aws-iam";
import { Bucket } from "aws-cdk-lib/lib/aws-s3";

export class Policies {

    private blogsPhotosBucket: Bucket;
    public uploadBlogPhotos: PolicyStatement;
    
    constructor(blogsPhotosBucket: Bucket) {
        this.blogsPhotosBucket = blogsPhotosBucket;
        this.initialize();
    }

    private initialize() {
        this.uploadBlogPhotos = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                's3:PutObject',
                's3:PutObjectAcl'
            ],
            resources: [this.blogsPhotosBucket.bucketArn + '/*']
        });
    }
}