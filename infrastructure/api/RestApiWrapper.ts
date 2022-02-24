import { Stack } from "aws-cdk-lib";
import { GenericLambdas } from "../services/GenericLambdas";
import { AuthorizationType, Cors, MethodOptions, ResourceOptions, RestApi } from 'aws-cdk-lib/lib/aws-apigateway';
import { AuthorizerWrapper } from "../auth/AuthorizerWrapper";
import { Policies } from "../Policies";
import { Construct } from "constructs";
import { Bucket } from "aws-cdk-lib/lib/aws-s3";


export class RestApiWrapper {

    public rest_api: RestApi;
    private stack: Stack;
    private lambdas: GenericLambdas;
    public authWrapper: AuthorizerWrapper;
    private policies: Policies;
    private photoBucket: Bucket;

    constructor( scope:Construct,stack:Stack, blogsPhotosBucket:Bucket) {

        this.photoBucket = blogsPhotosBucket;
        this.stack = stack;
        this.policies = new Policies(this.photoBucket);
        this.rest_api = new RestApi(this.stack, 'blogs-photos-api');
        this.authWrapper = new AuthorizerWrapper(scope, this.rest_api, this.policies);
        
        this.intialiseApi();
    }

    private intialiseApi() {
        this.lambdas = new GenericLambdas(this.stack, {
            createLambdaPath: 'Create',
            readLambdaPath: 'Read',
            deleteLambdaPath: 'Delete'
        })

        const optionsWithAuthorizer: MethodOptions = {
            authorizationType: AuthorizationType.COGNITO,
            authorizer: {
                authorizerId: this.authWrapper.authorizer.authorizerId
            }
        }
    
        const optionsWithCors:ResourceOptions = {
            defaultCorsPreflightOptions : {
                allowOrigins: Cors.ALL_ORIGINS,
                allowMethods: Cors.ALL_METHODS
            }
        }
    
         //Blogs API integrations:
        const blogResource = this.rest_api.root.addResource('blogs', optionsWithCors);
        blogResource.addMethod('POST', this.lambdas.createLambdaIntegration, optionsWithAuthorizer);
        blogResource.addMethod('GET', this.lambdas.readLambdaIntegration, optionsWithAuthorizer);
        blogResource.addMethod('DELETE', this.lambdas.deleteLambdaIntegration, optionsWithAuthorizer);


    }

}