
import { CfnOutput } from "aws-cdk-lib";
import { CfnDataSource, CfnGraphQLApi, CfnGraphQLSchema, CfnResolver } from "aws-cdk-lib/lib/aws-appsync";
import { CfnRole } from "aws-cdk-lib/lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/lib/aws-lambda-nodejs";
import { UserPool } from 'aws-cdk-lib/lib/aws-cognito';
import { Construct } from "constructs";
import { config } from '../config';

export class AppsyncWrapper {

    private scope : Construct;
    private api: CfnGraphQLApi;
    private userPool: UserPool;
    private userLambda: NodejsFunction;
    private blogLambda: NodejsFunction;
    private entryLambda: NodejsFunction;
    
    constructor(scope: Construct,userPool:UserPool, userLambda:NodejsFunction, blogLambda:NodejsFunction, entryLambda:NodejsFunction){
        this.scope = scope;
        this.userPool = userPool;
        this.userLambda = userLambda;
        this.blogLambda = blogLambda;
        this.entryLambda = entryLambda;
        this.initialise();
    }

    private initialise(){
        this.initialiseApi();
        this.initialiseDataSources();
    }

    private initialiseApi(){

        this.api = new CfnGraphQLApi(this.scope, 'graphql-blog-api', {
            name: 'graphql-blog-api',
            authenticationType: 'API_KEY',
            additionalAuthenticationProviders: [{
              authenticationType :  'AMAZON_COGNITO_USER_POOLS',
              userPoolConfig: {
                userPoolId: this.userPool.userPoolId,
                awsRegion: config.REGION
              }
            }]
            
        })
        new CfnOutput(this.scope, 'GraphQLApiId', {
            value: this.api.attrApiId
        })

        const schema = new CfnGraphQLSchema(this.scope, 'blog-schema', {
            apiId: this.api.attrApiId,
            definition: `
            type User {
                id: ID!
                username: String!
                createdAt: String!
                email: String!
                password: String!
                tokens: String
                entries: [Entry]
                blogs: [Blog]
              }
            
              type Blog @aws_api_key
              @aws_cognito_user_pools {
                id: ID!
                title: String!
                content: String!
                createdAt: String!
                user: ID!
                entries: [Entry]!
                owner: User
                blogPhotoId: String
              }
            
              type Entry @aws_api_key
              @aws_cognito_user_pools {
                id: ID!
                title: String!
                content: String!
                createdAt: String!
                blog_id: ID!
                user: ID!
                parent_blog: Blog
                owner: User
                entryPhotoId: String
              }
            
              input UserInput {
                username: String
                email: String
                password: String
              }
            
              input BlogInput {
                title: String
                content: String
                createdAt: String
              }
            
              input EntryInput {
                title: String
                content: String
                createdAt: String
              }
            
              input AuthInput {
                email: String!
                password: String!
              }
            
              type Query @aws_api_key
              @aws_cognito_user_pools{
                user(id: ID!): User!
                users(input: UserInput): [User]!
                blog(id: ID!): Blog!
                blogs(input: BlogInput): [Blog]!
                blogsByUser(id: ID!): [Blog]!
                entry(id: ID!): Entry!
                entries(input: EntryInput): [Entry]!
              }
            
              input NewUserInput {
                username: String!
                email: String!
                password: String!
              }
            
              input NewBlogInput {
                title: String!
                content: String!
                user: ID!
                blogPhotoId: String
              }
            
              input NewEntryInput {
                title: String!
                content: String!
                user: ID!
                blog_id: ID!
                entryPhotoId: String
              }

              input deleteBlogType {
                id: ID!
                user: ID!
              }
            
              type Mutation {
                createUser(input: NewUserInput!): User!
                createBlog(input: NewBlogInput!): Blog!
                  @aws_cognito_user_pools
                createEntry(input: NewEntryInput!): Entry!
                  @aws_cognito_user_pools
                deleteBlog(input: deleteBlogType!): String!
                  @aws_cognito_user_pools
                deleteEntry(id: String!): Entry!
                  @aws_cognito_user_pools
                deleteUser(id: String!): User!
                  @aws_cognito_user_pools
                login(input: AuthInput!): User
              }
            `
            });
    }

    private initialiseDataSources(){
          
            const blogLambdaServiceRole = new CfnRole(this.scope, 'blogLambdaRole', {
              assumeRolePolicyDocument: {
                "Version": "2012-10-17",
                "Statement": [
                  {
                    "Effect": "Allow",
                    "Principal": {
                      "Service": "appsync.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                  }
                ]
              },
              policies: [{
                policyName: 'blogLambdaPolicy',
                policyDocument: {
                  "Version": "2012-10-17",
                  "Statement": [
                      {
                          "Effect": "Allow",
                          "Action": [
                              "lambda:invokeFunction"
                          ],
                          "Resource": [
                              this.blogLambda.functionArn,
                              `${this.blogLambda.functionArn}:*`
                          ]
                      }
                  ]
                }
              }]
            });

            const userLambdaServiceRole = new CfnRole(this.scope, 'userLambdaRole', {
              assumeRolePolicyDocument: {
                "Version": "2012-10-17",
                "Statement": [
                  {
                    "Effect": "Allow",
                    "Principal": {
                      "Service": "appsync.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                  }
                ]
              },
              policies: [{
                policyName: 'userLambdaPolicy',
                policyDocument: {
                  "Version": "2012-10-17",
                  "Statement": [
                      {
                          "Effect": "Allow",
                          "Action": [
                              "lambda:invokeFunction"
                          ],
                          "Resource": [
                              this.userLambda.functionArn,
                              `${this.userLambda.functionArn}:*`
                          ]
                      }
                  ]
                }
              }]
            });

            const entryLambdaServiceRole = new CfnRole(this.scope, 'entryLambdaRole', {
              assumeRolePolicyDocument: {
                "Version": "2012-10-17",
                "Statement": [
                  {
                    "Effect": "Allow",
                    "Principal": {
                      "Service": "appsync.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                  }
                ]
              },
              policies: [{
                policyName: 'entryLambdaPolicy',
                policyDocument: {
                  "Version": "2012-10-17",
                  "Statement": [
                      {
                          "Effect": "Allow",
                          "Action": [
                              "lambda:invokeFunction"
                          ],
                          "Resource": [
                              this.entryLambda.functionArn,
                              `${this.entryLambda.functionArn}:*`
                          ]
                      }
                  ]
                }
              }]
            });

            const userLambdaSource = new CfnDataSource(this.scope, 'UserLambdaDataSource', {
              name: 'UserLambdaDataSource',
              type: 'AWS_LAMBDA',
              apiId: this.api.attrApiId,
              lambdaConfig: {
                lambdaFunctionArn: this.userLambda.functionArn
              },
              serviceRoleArn: userLambdaServiceRole.attrArn
            });

                  // new CfnResolver(this.scope, 'query-findOneUser', {
                  //   apiId: this.api.attrApiId,
                  //   typeName: 'Query',
                  //   fieldName: 'user',
                  //   dataSourceName: userLambdaSource.name,
                  //   requestMappingTemplate: `
                  //     {
                  //       "version" : "2017-02-28",
                  //       "operation": "Invoke",
                  //       "payload": {
                  //         "field":"findOne",
                  //         "arguments" : $util.toJson($context.arguments)
                  //       }
                  //     }`,
                  //   responseMappingTemplate: `
                  //     $util.toJson($context.result)
                  //   `
                  // })

                  // new CfnResolver(this.scope, 'query-findAllUsers', {
                  //   apiId: this.api.attrApiId,
                  //   typeName: 'Query',
                  //   fieldName: 'users',
                  //   dataSourceName: userLambdaSource.name,
                  //   requestMappingTemplate: `
                  //     {
                  //       "version" : "2017-02-28",
                  //       "operation": "Invoke",
                  //       "payload": {
                  //       "field":"findMany"
                  //       }
                  //     }`,
                  //   responseMappingTemplate: `
                  //     $util.toJson($context.result)
                  //   `
                  // })

                  // new CfnResolver(this.scope, 'chain-blogFindOwner', {
                  //   apiId: this.api.attrApiId,
                  //   typeName: 'Blog',
                  //   fieldName: 'owner',
                  //   dataSourceName: userLambdaSource.name,
                  //   requestMappingTemplate: `
                  //     {
                  //       "version" : "2017-02-28",
                  //       "operation": "Invoke",
                  //       "payload": {
                  //         "field":"findOne",
                  //         "arguments" : {
                  //           "id": $util.toJson($context.source.user)
                  //         }
                  //       }
                  //     }`,
                  //   responseMappingTemplate: `
                  //     $util.toJson($context.result)
                  //   `
                  // })

                  // new CfnResolver(this.scope, 'chain-entryFindOwner', {
                  //   apiId: this.api.attrApiId,
                  //   typeName: 'Entry',
                  //   fieldName: 'owner',
                  //   dataSourceName: userLambdaSource.name,
                  //   requestMappingTemplate: `
                  //     {
                  //       "version" : "2017-02-28",
                  //       "operation": "Invoke",
                  //       "payload": {
                  //         "field":"findOne",
                  //         "arguments" : {
                  //           "id": $util.toJson($context.source.user)
                  //         }
                  //       }
                  //     }`,
                  //   responseMappingTemplate: `
                  //     $util.toJson($context.result)
                  //   `
                  // })

                  // new CfnResolver(this.scope, 'mutation-createUser', {
                  //   apiId: this.api.attrApiId,
                  //   typeName: 'Mutation',
                  //   fieldName: 'createUser',
                  //   dataSourceName: userLambdaSource.name,
                  //   requestMappingTemplate: `
                  //     {
                  //       "version" : "2017-02-28",
                  //       "operation": "Invoke",
                  //       "payload": {
                  //         "field":"createUser",
                  //         "arguments" : $util.toJson($context.arguments)
                  //       }
                  //     }`,
                  //   responseMappingTemplate: `
                  //     $util.toJson($context.result)
                  //   `
                  // })

                  // new CfnResolver(this.scope, 'mutation-deleteUser', {
                  //   apiId: this.api.attrApiId,
                  //   typeName: 'Mutation',
                  //   fieldName: 'deleteUser',
                  //   dataSourceName: userLambdaSource.name,
                  //   requestMappingTemplate: `
                  //   {
                  //     "version" : "2017-02-28",
                  //     "operation": "Invoke",
                  //     "payload": {
                  //       "field":"deleteUser",
                  //       "arguments": $util.toJson($context.args)
                  //      }
                  //   }`,
                  //   responseMappingTemplate: `
                  //     $util.toJson($context.result)
                  //   `
                  // })

                  // new CfnResolver(this.scope, 'mutation-loginUser', {
                  //   apiId: this.api.attrApiId,
                  //   typeName: 'Mutation',
                  //   fieldName: 'login',
                  //   dataSourceName: userLambdaSource.name,
                  //   requestMappingTemplate: `
                  //   {
                  //     "version" : "2017-02-28",
                  //     "operation": "Invoke",
                  //     "payload":  {
                  //       "field":"findLogin",
                  //       "arguments": $util.toJson($context.args)
                  //      }
                  //   }`,
                  //   responseMappingTemplate: `
                  //     $util.toJson($context.result)
                  //   `
                  // })

            const blogLambdaSource = new CfnDataSource(this.scope, 'BlogLambdaDataSource', {
              name: 'BlogLambdaDataSource',
              type: 'AWS_LAMBDA',
              apiId: this.api.attrApiId,
              lambdaConfig: {
                lambdaFunctionArn: this.blogLambda.functionArn
              },
              serviceRoleArn: blogLambdaServiceRole.attrArn
            });

                    
                    // new CfnResolver(this.scope, 'mutation-createBlog', {
                    //   apiId: this.api.attrApiId,
                    //   typeName: 'Mutation',
                    //   fieldName: 'createBlog',
                    //   dataSourceName: blogLambdaSource.name,
                    //   requestMappingTemplate: `
                    //   {
                    //     "version" : "2017-02-28",
                    //     "operation": "Invoke",
                    //     "payload": {
                    //       "field":"createBlog",
                    //         "arguments":$util.toJson($context.arguments)
                    //         }
                    //   }`,
                    //   responseMappingTemplate: `
                    //     $util.toJson($context.result)
                    //   `
                    // })

                    // new CfnResolver(this.scope, 'mutation-deleteBlog', {
                    //   apiId: this.api.attrApiId,
                    //   typeName: 'Mutation',
                    //   fieldName: 'deleteBlog',
                    //   dataSourceName: blogLambdaSource.name,
                    //   requestMappingTemplate: `
                    //   {
                    //     "version" : "2017-02-28",
                    //     "operation": "Invoke",
                    //     "payload": {
                    //       "field": "deleteBlog",
                    //         "arguments": $util.toJson($context.arguments)
                    //     }
                    //   }`,
                    //   responseMappingTemplate: `
                    //     $util.toJson($context.result)
                    //   `
                    // })

                    // new CfnResolver(this.scope, 'query-findOneBlog', {
                    //   apiId: this.api.attrApiId,
                    //   typeName: 'Query',
                    //   fieldName: 'blog',
                    //   dataSourceName: blogLambdaSource.name,
                    //   requestMappingTemplate: `
                    //   {
                    //     "version" : "2017-02-28",
                    //     "operation": "Invoke",
                    //     "payload": {
                    //       "field": "findOne",
                    //       "arguments": $util.toJson($context.arguments)
                    //     }
                    //   }`,
                    //   responseMappingTemplate: `
                    //     $util.toJson($context.result)
                    //   `
                    // })

                    // new CfnResolver(this.scope, 'query-findAllBlogs', {
                    //   apiId: this.api.attrApiId,
                    //   typeName: 'Query',
                    //   fieldName: 'blogs',
                    //   dataSourceName: blogLambdaSource.name,
                    //   requestMappingTemplate: `
                    //   {
                    //     "version" : "2017-02-28",
                    //     "operation": "Invoke",
                    //     "payload": {
                    //       "field":"findMany"
                    //     }
                    //   }`,
                    //   responseMappingTemplate: `
                    //     $util.toJson($context.result)
                    //   `
                    // })

                    // new CfnResolver(this.scope, 'query-blogsByUser', {
                    //   apiId: this.api.attrApiId,
                    //   typeName: 'Query',
                    //   fieldName: 'blogsByUser',
                    //   dataSourceName: blogLambdaSource.name,
                    //   requestMappingTemplate: `{
                    //     "version" : "2017-02-28",
                    //     "operation": "Invoke",
                    //     "payload": {
                    //       "field":"findByUser",
                    //       "arguments" : {
                    //         "id": $util.toJson($context.arguments)
                    //       }
                    //     }
                    //   }`,
                    //   responseMappingTemplate: `
                    //     $util.toJson($context.result)
                    //   `
                    // })

                    // new CfnResolver(this.scope, 'chain-blogsByUser', {
                    //   apiId: this.api.attrApiId,
                    //   typeName: 'User',
                    //   fieldName: 'blogs',
                    //   dataSourceName: blogLambdaSource.name,
                    //   requestMappingTemplate: `
                    //   {
                    //     "version" : "2017-02-28",
                    //     "operation": "Invoke",
                    //     "payload": {
                    //       "field":"findByUser",
                    //       "arguments" : {
                    //         "id": $util.toJson($context.source.id)
                    //       }
                    //     }
                    //   }`,
                    //   responseMappingTemplate: `
                    //     $util.toJson($context.result)
                    //   `
                    // })

                    // new CfnResolver(this.scope, 'chain-entryFindBlog', {
                    //   apiId: this.api.attrApiId,
                    //   typeName: 'Entry',
                    //   fieldName: 'parent_blog',
                    //   dataSourceName: blogLambdaSource.name,
                    //   requestMappingTemplate: `
                    //   {
                    //     "version" : "2017-02-28",
                    //     "operation": "Invoke",
                    //     "payload": {
                    //       "field": "findOne",
                    //       "arguments": {
                    //         "id": $util.toJson($context.source.blog_id)
                    //       }
                    //     }
                    //   }`,
                    //   responseMappingTemplate: `
                    //     $util.toJson($context.result)
                    //   `
                    // })


            const entryLambdaSource = new CfnDataSource(this.scope, 'EntryLambdaDataSource', {
              name: 'EntryLambdaDataSource',
              type: 'AWS_LAMBDA',
              apiId: this.api.attrApiId,
              lambdaConfig: {
                lambdaFunctionArn: this.entryLambda.functionArn
              },
              serviceRoleArn: entryLambdaServiceRole.attrArn
            });

                    // new CfnResolver(this.scope, 'mutation-createEntry', {
                    //   apiId: this.api.attrApiId,
                    //   typeName: 'Mutation',
                    //   fieldName: 'createEntry',
                    //   dataSourceName: entryLambdaSource.name,
                    //   requestMappingTemplate: `
                    //   {
                    //     "version" : "2017-02-28",
                    //     "operation": "Invoke",
                    //     "payload": {
                    //       "field": "createEntry",
                    //         "arguments": $util.toJson($context.arguments)
                    //     } 
                    //   }`,
                    //   responseMappingTemplate: `
                    //     $util.toJson($context.result)
                    //   `
                    // })

                    // new CfnResolver(this.scope, 'mutation-deleteEntry', {
                    //   apiId: this.api.attrApiId,
                    //   typeName: 'Mutation',
                    //   fieldName: 'deleteEntry',
                    //   dataSourceName: entryLambdaSource.name,
                    //   requestMappingTemplate: `
                    //   {
                    //     "version" : "2017-02-28",
                    //     "operation": "Invoke",
                    //     "payload": {
                    //       "field": "deleteEntry",
                    //         "arguments": $util.toJson($context.arguments)
                    //     }
                    //   }`,
                    //   responseMappingTemplate: `
                    //     $util.toJson($context.result)
                    //   `
                    // })

                    // new CfnResolver(this.scope, 'query-findOneEntry', {
                    //   apiId: this.api.attrApiId,
                    //   typeName: 'Query',
                    //   fieldName: 'entry',
                    //   dataSourceName: entryLambdaSource.name,
                    //   requestMappingTemplate: `
                    //   {
                    //     "version" : "2017-02-28",
                    //     "operation": "Invoke",
                    //     "payload":  {
                    //       "field":"findOne",
                    //       "arguments": $util.toJson($context.args)
                    //      }
                    //   }`,
                    //   responseMappingTemplate: `
                    //     $util.toJson($context.result)
                    //   `
                    // })

                    // new CfnResolver(this.scope, 'query-findAllEntries', {
                    //   apiId: this.api.attrApiId,
                    //   typeName: 'Query',
                    //   fieldName: 'entries',
                    //   dataSourceName: entryLambdaSource.name,
                    //   requestMappingTemplate: `
                    //   {
                    //     "version" : "2017-02-28",
                    //     "operation": "Invoke",
                    //     "payload":  {
                    //       "field":"findMany",
                    //       "arguments": $util.toJson($context.args)
                    //      }
                    //   }`,
                    //   responseMappingTemplate: `
                    //     $util.toJson($context.result)
                    //   `
                    // })

                    // new CfnResolver(this.scope, 'chain-userFindEntries', {
                    //   apiId: this.api.attrApiId,
                    //   typeName: 'User',
                    //   fieldName: 'entries',
                    //   dataSourceName: entryLambdaSource.name,
                    //   requestMappingTemplate: `
                    //   {
                    //     "version" : "2017-02-28",
                    //     "operation": "Invoke",
                    //     "payload": {
                    //       "field":"findByUser",
                    //       "arguments" : {
                    //         "id": $util.toJson($context.source.id)
                    //       }
                    //     }
                    //   }`,
                    //   responseMappingTemplate: `
                    //     $util.toJson($context.result)
                    //   `
                    // })

                    // new CfnResolver(this.scope, 'chain-blogFindEntries', {
                    //   apiId: this.api.attrApiId,
                    //   typeName: 'Blog',
                    //   fieldName: 'entries',
                    //   dataSourceName: entryLambdaSource.name,
                    //   requestMappingTemplate: `
                    //   {
                    //     "version" : "2017-02-28",
                    //     "operation": "Invoke",
                    //     "payload": {
                    //       "field":"findByBlog",
                    //       "arguments": {
                    //         "blog_id": $util.toJson($context.source.id)
                    //       }
                    //     }
                    //   }`,
                    //   responseMappingTemplate: `
                    //     $util.toJson($context.result)
                    //   `
                    // })


        }

}