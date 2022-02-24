import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { config } from '../config';

const s3Client = new S3({
    region: config.REGION
});

async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult>{         
    
    const result: APIGatewayProxyResult = {
        statusCode: 200,
        body: 'temporary',
        headers: {
            'Content-type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*'
        },
        isBase64Encoded: false
    }

    const buffer = Buffer.from(event.body!.split('base64,')[1], 'base64');
    
    const filePath = "blogs/" + event.queryStringParameters?.filename;
    
    const params = {
        "Body": buffer,
        "Bucket": config.BLOGS_PHOTOS_BUCKET,
        "Key": filePath,
        "ACL": 'public-read'  
    };
    
    try {
        let data = await s3Client.upload(params).promise();
        result.body = JSON.stringify(data);
    } catch (error:any) {
        result.statusCode = 500;
        result.body = JSON.stringify(error.message);
    }
    return result

};

export { handler }