import { CfnOutput } from "aws-cdk-lib";
import { CognitoUserPoolsAuthorizer, RestApi } from "aws-cdk-lib/lib/aws-apigateway";
import { UserPool, UserPoolClient } from "aws-cdk-lib/lib/aws-cognito";
import { Construct } from "constructs";
import { Policies } from "../Policies";
import { IdentityPoolWrapper } from "./IdentityPoolWrapper";

export class AuthorizerWrapper {

    private scope: Construct;
    private rest_api: RestApi;
    private policies: Policies;

    public userPool: UserPool;
    private userPoolClient: UserPoolClient;
    public authorizer: CognitoUserPoolsAuthorizer;
    //private identityPoolWrapper: IdentityPoolWrapper;

    constructor(scope:Construct, api: RestApi, policies: Policies){
        
        this.scope = scope;
        this.rest_api = api;
        this.policies = policies;
        this.initialize();
    }

    private initialize(){
        this.createUserPool();
        this.addUserPoolClient();
        this.createAuthorizer();
        this.initializeIdentityPoolWrapper();
    }

    private createUserPool(){
        this.userPool = new UserPool(this.scope, 'BlogUserPool', {
            userPoolName: 'BlogUserPool',
            selfSignUpEnabled: true,
            signInAliases: {
                username: true,
                email: true
            }
        });
        new CfnOutput(this.scope, 'BlogPoolId', {
            value: this.userPool.userPoolId
        })
    }

    private addUserPoolClient(){
        this.userPoolClient = this.userPool.addClient('BlogUserPool-client', {
            userPoolClientName: 'BlogUserPool-client',
            authFlows: {
                adminUserPassword: true,
                custom: true,
                userPassword: true,
                userSrp: true
            },
            generateSecret: false
        })
        new CfnOutput(this.scope, 'UserPoolClientId', {
            value: this.userPoolClient.userPoolClientId
        })
    }

    private createAuthorizer(){
        this.authorizer = new CognitoUserPoolsAuthorizer(this.scope, 'BlogUserAuthorizer', {
            cognitoUserPools: [this.userPool],
            authorizerName: 'BlogUserAuthorizer',
            identitySource: 'method.request.header.Authorization'
        });
        this.authorizer._attachToApi(this.rest_api);
    }

    private initializeIdentityPoolWrapper(){
        new IdentityPoolWrapper(
            this.scope,
            this.userPool,
            this.userPoolClient,
            this.policies
        )
    }

}
