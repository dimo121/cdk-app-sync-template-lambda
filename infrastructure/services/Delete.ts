import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { config } from '../config';

async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {

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

    const s3Client = new S3({
        region: config.REGION
    })

    const params = {
        "Bucket": config.BLOGS_PHOTOS_BUCKET,
        "Key": event.queryStringParameters?.key!,
    };

    try {
        let data = await s3Client.deleteObject(params).promise()

        result.body = JSON.stringify(data);

    } catch (error:any) {
        result.statusCode = 400;
        
        result.body = JSON.stringify(error.message);
    }
    return result
}


export { handler }