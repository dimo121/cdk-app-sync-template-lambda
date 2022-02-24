import { generateRandomId } from '../infrastructure/utils/Utils';
import AWS from 'aws-sdk';

var docClient = new AWS.DynamoDB.DocumentClient();

var dynamo = new AWS.DynamoDB();


exports.handler = async (event,context) => {
  switch(event.field){
    case 'findOne':
      var params = {
        ProjectionExpression: 'id, title, content, createdAt, blog_id, entryPhotoId',
        TableName: 'Myentries',
        Key: {
          id: {
            S: event.arguments.id,
          },
        },
      }
      var data

      try {
        data = await dynamo.getItem(params).promise()
      } catch (err) {
        console.log(err)
      }

      //reformatting dynamodb return element
      data.Item.id = data.Item.id.S
      data.Item.createdAt = data.Item.createdAt.S
      data.Item.title = data.Item.title.S
      data.Item.content = data.Item.content.S
      data.Item.blog_id = data.Item.blog_id.S
      data.Item.entryPhotoId = data.Item.entryPhotoId.S

      return data.Item
      break;
    case 'findMany':
      var params = {
        TableName: 'Myentries',
      }

      var data

      try {
        data = await docClient.scan(params).promise()
      } catch (err) {
        console.log(err)
      }

      return data.Items
      break;
    case 'findByBlog':
      var params = {
        TableName: 'Myentries',
        IndexName: 'blog_idIndex',
        KeyConditionExpression: 'blog_id = :blog_id',
        ExpressionAttributeValues: { ':blog_id': event.arguments.blog_id },
        ProjectionExpression: 'id, title, content, createdAt, blog_id, #user, entryPhotoId',
        ExpressionAttributeNames: { '#user': 'user' },
      }

      var data

      try {
        data = await docClient.query(params).promise()
      } catch (err) {
        throw new Error(`500 - ${err}`);
      }

      return data.Items
      break;
    case 'findByUser':
      var params = {
        TableName: 'Myentries',
        IndexName: 'userIndex',
        KeyConditionExpression: '#user = :user_id',
        ExpressionAttributeNames: { '#user': 'user' },
        ExpressionAttributeValues: { ':user_id': event.arguments.id },
        ProjectionExpression: 'id, title, content, createdAt, blog_id, #user, entryPhotoId',
      }

      var data

      try {
        data = await docClient.query(params).promise()
      } catch (err) {
        console.log(err)
      }

      return data.Items
      break;
    case 'createEntry':
      var date = new Date()

      var id = generateRandomId()

      var params = {
        TableName: 'Myentries',
        Key: {
          id,
        },
        UpdateExpression:
          'SET createdAt = :createdAt, title = :title, content = :content, #user = :user, blog_id = :blog_id, entryPhotoId = :entryPhotoId',
        ExpressionAttributeValues: {
          ':createdAt': date.toLocaleDateString('en-GB'),
          ':title': event.arguments.input.title,
          ':content': event.arguments.input.content,
          ':blog_id': event.arguments.input.blog_id,
          ':user': event.arguments.input.user,
          ':entryPhotoId': event.arguments.input.entryPhotoId
        },
        ExpressionAttributeNames: { '#user': 'user' },
        ReturnValues: 'ALL_NEW',
      }

      var result

      try {
        await docClient
          .update(params, (err, data) => {
            if (err) {
              console.log('Unable to add item :', err)
              throw new Error(err)
            } else {
              console.log('Item added succesfully.', data)
              result = data.Attributes
            }
          })
          .promise()
      } catch (e) {
        //check error return code
        console.log(e)
      }

      return result
      break;
    case 'deleteEntry': 
      
      // params = {
      //   ProjectionExpression: '#user',
      //   TableName: 'Myentries',
      //   Key: {
      //     id: {
      //       S: event.arguments.id,
      //     },
      //   },
      //   ExpressionAttributeNames: { '#user': 'user' },
      // }

      // var data

      // try {
      //   data = await dynamo.getItem(params).promise()
      // } catch (err) {
      //   console.log(err)
      // }

      // if (data.Item.user.S !== event.arguments.user) {
      //   throw new Error('Not authenticated to delete this entry')
      // }

      var params = {
        TableName: 'Myentries',
        Key: {
          id: {
            S: event.arguments.id,
          },
        },
        ReturnValues: 'ALL_OLD',
      }

      var result = { id: '' }

      await dynamo
        .deleteItem(params, (err, data) => {
          if (err) {
            console.log('Unable to delete item: ', JSON.stringify(err, null, 2))
          } else {
            console.log(
              'Item deleted succesfully: ',
              JSON.stringify(data, null, 2),
            )
            //dynamo response reformatting

            if (data.hasOwnProperty('Attributes'))
              result.id = data.Attributes.id.S
          }
        })
        .promise()

      return result;
      break;
  }
}
