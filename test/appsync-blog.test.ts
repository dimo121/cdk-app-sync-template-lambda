import * as cdk from 'aws-cdk-lib';
import * as AppsyncBlog from '../lib/appsync-blog-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new AppsyncBlog.AppsyncBlogStack(app, 'MyTestStack');
    // THEN
    const actual = app.synth().getStackArtifact(stack.artifactId).template;
    expect(actual.Resources ?? {}).toEqual({});
});
