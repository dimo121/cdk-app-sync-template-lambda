import { Stack, StackProps, Fn, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/lib/aws-lambda-nodejs';
import { PolicyStatement } from 'aws-cdk-lib/lib/aws-iam';
import { Bucket, HttpMethods } from 'aws-cdk-lib/lib/aws-s3';
import { AppsyncWrapper } from './api/AppsyncWrapper';
import { WebAppDeployment } from './app/WebAppDeployment';
import { RestApiWrapper } from './api/RestApiWrapper';
import { config } from './config';
 
export class AppsyncBlogStack extends Stack {

    private userLambdaNodeJs: NodejsFunction;
    private blogLambdaNodeJs: NodejsFunction;
    private entryLambdaNodeJs: NodejsFunction;
    private blogsPhotosBucket: Bucket;
    private suffix: string;
    private stack: Stack = this;
    private restWrapper: RestApiWrapper;

    constructor(scope:Construct,id:string, props: StackProps){

        super(scope,id,props);
        
        this.initialiseLambdas();
        this.initialiseLambdaPermissions();
        this.initializeSuffix();
        this.initializeBlogsPhotosBucket();
        
        this.restWrapper = new RestApiWrapper(this, this.stack, this.blogsPhotosBucket);

        new AppsyncWrapper(this, this.restWrapper.authWrapper.userPool, this.userLambdaNodeJs,this.blogLambdaNodeJs,this.entryLambdaNodeJs);

        new WebAppDeployment(this, this.suffix);
       
    }

    private initializeSuffix(){
        const shortStackId = Fn.select(2, Fn.split('/', this.stackId));
        const Suffix = Fn.select(4, Fn.split('-', shortStackId));
        this.suffix = Suffix;
    }

    private initialiseLambdas(){
        
        this.userLambdaNodeJs = new NodejsFunction(this,'userLambdaNodeJs', {
            entry: (path.join(__dirname, '..', 'services', 'user.js')),
            handler: 'handler'
        });

        this.entryLambdaNodeJs = new NodejsFunction(this,'entryLambdaNodeJs', {
            entry: (path.join(__dirname, '..', 'services', 'entry.js')),
            handler: 'handler'
        });

        this.blogLambdaNodeJs = new NodejsFunction(this,'blogLambdaNodeJs', {
            entry: (path.join(__dirname, '..', 'services', 'blog.js')),
            handler: 'handler'
        });

    }

    private initialiseLambdaPermissions(){

        const dynamoUserPolicy = new PolicyStatement();
        dynamoUserPolicy.addActions("dynamodb:*");
        dynamoUserPolicy.addResources(`arn:aws:dynamodb:${config.REGION}:${config.ACCOUNT_ID}:table/MyblogUsers`);
        dynamoUserPolicy.addResources(`arn:aws:dynamodb:${config.REGION}:${config.ACCOUNT_ID}:table/MyblogUsers/*`);
        this.userLambdaNodeJs.addToRolePolicy(dynamoUserPolicy);

        const dynamoBlogPolicy = new PolicyStatement();
        dynamoBlogPolicy.addActions("dynamodb:*");
        dynamoBlogPolicy.addResources(`arn:aws:dynamodb:${config.REGION}:${config.ACCOUNT_ID}:table/Myblog`);
        dynamoBlogPolicy.addResources(`arn:aws:dynamodb:${config.REGION}:${config.ACCOUNT_ID}:table/Myblog/*`);
        dynamoBlogPolicy.addResources(`arn:aws:dynamodb:${config.REGION}:${config.ACCOUNT_ID}:table/Myentries`);
        dynamoBlogPolicy.addResources(`arn:aws:dynamodb:${config.REGION}:${config.ACCOUNT_ID}:table/Myentries/*`);
        this.blogLambdaNodeJs.addToRolePolicy(dynamoBlogPolicy);

        const dynamoEntryPolicy = new PolicyStatement();
        dynamoEntryPolicy.addActions("dynamodb:*");
        dynamoEntryPolicy.addResources(`arn:aws:dynamodb:${config.REGION}:${config.ACCOUNT_ID}:table/Myentries`);
        dynamoEntryPolicy.addResources(`arn:aws:dynamodb:${config.REGION}:${config.ACCOUNT_ID}:table/Myentries/*`);
        this.entryLambdaNodeJs.addToRolePolicy(dynamoEntryPolicy);
    }

    private initializeBlogsPhotosBucket() {
        this.blogsPhotosBucket = new Bucket(this, 'blogs-photos', {
            bucketName: 'blogs-photos-' + this.suffix,
            cors: [{
                allowedMethods: [
                    HttpMethods.HEAD,
                    HttpMethods.GET,
                    HttpMethods.PUT,
                    HttpMethods.DELETE
                ],
                allowedOrigins: ['*'],
                allowedHeaders: ['*']
            }]
        });
        new CfnOutput(this, 'blogs-photos-bucket-name', {
            value: this.blogsPhotosBucket.bucketName
        })
    }


}