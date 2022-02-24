import { AppsyncBlogStack } from './AppsyncBlogStack'
import { App } from 'aws-cdk-lib';
import { config } from './config';

const app = new App()

new AppsyncBlogStack(app, config.STACK_NAME, {
    stackName:config.STACK_NAME
})