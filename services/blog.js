import { generateRandomId } from '../infrastructure/utils/Utils';
import AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient();

const dynamo = new AWS.DynamoDB();

exports.handler = async (event,context) => {
  switch(event.field) {
    case 'findOne':
      var params = {
        ProjectionExpression: 'id, createdAt, title, content, #user, blogPhotoId',
        TableName: 'Myblog',
        Key: {
          id: {
            S: event.arguments.id,
          },
        },
        ExpressionAttributeNames: { '#user': 'user' },
      }
      
      var data;

      await dynamo.getItem(params).promise()
        .then(result => {
          data = result 
        }, err => {
         throw new Error(`500 - ${err}`)
      })

      //reformatting dynamodb return element
      if (!data.Item) {
        throw new Error('500 - Blog not found')
      }
      data.Item.id = data.Item.id.S
      data.Item.createdAt = data.Item.createdAt.S
      data.Item.title = data.Item.title.S
      data.Item.content = data.Item.content.S
      data.Item.user = data.Item.user.S
      data.Item.blogPhotoId = data.Item.blogPhotoId.S

      return data.Item
      break;
    case 'findByUser':
      var params = {
        TableName: 'Myblog',
        IndexName: 'userIndex',
        KeyConditionExpression: '#user = :user_id',
        ExpressionAttributeNames: { '#user': 'user' },
        ExpressionAttributeValues: { ':user_id': event.arguments.id },
        ProjectionExpression: 'id, title, content, createdAt, #user, blogPhotoId',
      }

      var data;

      await docClient.query(params).promise()
        .then(result => {
        data = result 
      }, err => {
        throw new Error(`500 - ${err}`)
      })

      return data.Items
      break;
    case 'findMany':
      var params = {
        TableName: 'Myblog',
        Limit: 20,
      }

      var data;

      await docClient.scan(params).promise()
      .then(result => {
        data = result 
      }, err => {
        throw new Error(`500 - ${err}`)
      })

      return data.Items
      break;
    case 'createBlog':
      var date = new Date()

      var id = generateRandomId()

      var params = {
        TableName: 'Myblog',
        Key: {
          id,
        },
        UpdateExpression:
          'SET createdAt = :createdAt, title = :title, content = :content, #user = :user, blogPhotoId = :blogPhotoId',
        ExpressionAttributeValues: {
          ':createdAt': date.toLocaleDateString('en-GB'),
          ':title': event.arguments.input.title,
          ':content': event.arguments.input.content,
          ':user': event.arguments.input.user,
          ':blogPhotoId': event.arguments.input.blogPhotoId
        },
        ExpressionAttributeNames: { '#user': 'user' },
        ReturnValues: 'ALL_NEW',
      }

      var result;
      
      await docClient
      .update(params).promise()
      .then(data => {
        console.log('Item added succesfully.', data)
        result = data.Attributes
      }, err => {
        throw new Error(err);
      })

      return result
      break;
    case 'deleteBlog':
      var params = {
        ProjectionExpression: '#user',
        TableName: 'Myblog',
        Key: {
          id: {
            S: event.arguments.input.id,
          },
        },
        ExpressionAttributeNames: { '#user': 'user' },
      }

      var data;

      await dynamo.getItem(params).promise()
      .then(result => {
        data = result 
      }, err => {
        throw new Error(`500 - ${err}`)
      })

      if (data.Item.user.S !== event.arguments.input.user) {
        throw new Error('401 - Not authenticated')
      }

      params = {
        TableName: 'Myblog',
        Key: {
          id: {
            S: event.arguments.input.id,
          },
        },
        ReturnValues: 'ALL_OLD',
      }

      var result = { id: '' }

      await dynamo.deleteItem(params)
        .promise().then(res => {
          console.log('Item deleted succesfully: ', JSON.stringify(res, null, 2))
          if (data.hasOwnProperty('Attributes'))
              result.id = res.Attributes.id.S
        }, err => console.log('Unable to delete item: ', JSON.stringify(err, null, 2))
      )
      
      if(result.id){
        params = {
          TableName: 'Myentries',
          IndexName: 'blog_idIndex',
          KeyConditionExpression: 'blog_id = :blog_id',
          ExpressionAttributeValues: { ':blog_id': result.id },
          ProjectionExpression: 'id',
        }

        
        await docClient.query(params).promise()
        .then(result => {
          data = result 
        }, err => {
          throw new Error(`500 - ${err}`)
        })


        if (data.Items) {
          data.Items.forEach(async (item) => {
            params = {
              TableName: 'Myentries',
              Key: {
                id: {
                  S: item.id,
                },
              },
              ReturnValues: 'ALL_OLD',
            }

            await dynamo
              .deleteItem(params).promise()
              .then(res => {
                console.log('Item deleted succesfully: ',
                  JSON.stringify(res, null, 2),
                )
              }, err => {
                console.log('Unable to delete item: ',
                  JSON.stringify(err, null, 2),
                )
              })
          })
        }
      }

      return result
      break;
  }
}
