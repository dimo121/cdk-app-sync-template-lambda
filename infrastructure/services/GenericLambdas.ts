import { NodejsFunction } from "aws-cdk-lib/lib/aws-lambda-nodejs";
import { LambdaIntegration } from "aws-cdk-lib/lib/aws-apigateway";
import { PolicyStatement, Effect, Policy } from "aws-cdk-lib/lib/aws-iam";
import { join } from "path";
import { Stack } from "aws-cdk-lib";

interface IGenericLambdas {
    createLambdaPath?: string,
    readLambdaPath?: string,
    updateLambdaPath?: string,
    deleteLambdaPath?: string
}

export class GenericLambdas{

    private stack: Stack;
    private props: IGenericLambdas;

    private createLambda: NodejsFunction | undefined;
    private readLambda: NodejsFunction | undefined;
    private updateLambda: NodejsFunction | undefined;
    private deleteLambda: NodejsFunction | undefined;

    public createLambdaIntegration: LambdaIntegration;
    public readLambdaIntegration: LambdaIntegration;
    public updateLambdaIntegration: LambdaIntegration;
    public deleteLambdaIntegration: LambdaIntegration;

    private lambdaS3Policy: PolicyStatement;
    private lambdaLogPolicy: PolicyStatement;

    public constructor(stack:Stack, props:IGenericLambdas) {
        this.stack = stack;
        this.props = props;
        this.createLambdas();
    }

    private createLambdas(){

        this.lambdaLogPolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "logs:PutLogEvents",
                "logs:GetLogEvents",
                "logs:FilterLogEvents"
            ],
            resources: [ '*']
        });

        this.lambdaS3Policy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                's3:*',
                's3-object-lambda:*',
            ],
            resources: ['arn:aws:s3:::*']
        });

        if (this.props.createLambdaPath) {
            this.createLambda = this.createSingleLambda(this.props.createLambdaPath);
            this.createLambda.role?.attachInlinePolicy(new Policy(this.stack,'restapiBlogStackCreateLambda', {
                statements: [this.lambdaLogPolicy,this.lambdaS3Policy]
            }));
            this.createLambdaIntegration = new LambdaIntegration(this.createLambda);
        }
        if (this.props.readLambdaPath) {
            this.readLambda = this.createSingleLambda(this.props.readLambdaPath);
            this.readLambda.role?.attachInlinePolicy(new Policy(this.stack,'restapiBlogStackReadLambda', {
                statements: [this.lambdaLogPolicy,this.lambdaS3Policy]
            }));
            this.readLambdaIntegration = new LambdaIntegration(this.readLambda);
        }
        if (this.props.updateLambdaPath) {
            this.updateLambda = this.createSingleLambda(this.props.updateLambdaPath)
            this.updateLambda.role?.attachInlinePolicy(new Policy(this.stack,'restapiBlogStackUpdateLambda', {
                statements: [this.lambdaLogPolicy,this.lambdaS3Policy]
            }));
            this.updateLambdaIntegration = new LambdaIntegration(this.updateLambda);
        }
        if (this.props.deleteLambdaPath) {
            this.deleteLambda = this.createSingleLambda(this.props.deleteLambdaPath);
            this.deleteLambda.role?.attachInlinePolicy(new Policy(this.stack,'restapiBlogStackDeleteLambda', {
                statements: [this.lambdaLogPolicy,this.lambdaS3Policy]
            }));
            this.deleteLambdaIntegration = new LambdaIntegration(this.deleteLambda);
        }

    }

    private createSingleLambda(lambdaName: string): NodejsFunction{  
        
        const lambdaId = lambdaName + '382259764974'

        return new NodejsFunction(this.stack, lambdaId, {
            entry: (join(__dirname, `${lambdaName}.ts`)),
            handler: 'handler',
            functionName: lambdaId
        })
    }

}