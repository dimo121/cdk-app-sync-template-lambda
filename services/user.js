import { generateRandomId } from '../infrastructure/utils/Utils';
import AWS from 'aws-sdk';

var docClient = new AWS.DynamoDB.DocumentClient();

var dynamo = new AWS.DynamoDB();

exports.handler = async (event,context) => {
  switch(event.field){
    case 'findOne':
      var params = {
        ProjectionExpression: 'id, username, email, createdAt',
        TableName: 'MyblogUsers',
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
      data.Item.username = data.Item.username.S
      data.Item.email = data.Item.email.S

      return data.Item
      break;
    case 'findMany':
      var params = {
        ProjectionExpression: 'id, createdAt, username, email',
        TableName: 'MyblogUsers',
      }

      var data

      try {
        data = await docClient.scan(params).promise()
      } catch (err) {
        console.log(err)
      }

      return data.Items ? data.Items : null

      break;
    case 'findLogin':

      //# existing account is checked with given email

      var params = {
        TableName: 'MyblogUsers',
        IndexName: 'emailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': event.arguments.email },
        ProjectionExpression: 'id, username, password, email, createdAt',
      }

      var user = await docClient.query(params).promise()

      if (user.Count === 0) {
        throw new Error('Error 404 - User email does not exist')
      }

      user = user.Items[0]

      //var match = await bcrypt.compare(event.arguments.password, user.password)

      // if (!match) {
      //   throw new Error('Error 403 - Incorrect email and password combination')
      // }

      // var token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '24h' })

      //# setting token after password is compared with stored password

      params = {
        TableName: 'MyblogUsers',
        Key: {
          id: user.id,
        },
        UpdateExpression: 'set tokens = :token',
        ExpressionAttributeValues: { ':token': 1 },
        ReturnValues: 'ALL_NEW',
      }

      var result

      await docClient
        .update(params, (err, data) => {
          if (err) {
            console.log('Error 500 -', err);
          } else {
            //console.log(data)
            result = data;
          }
        })
        .promise()

      return result.Attributes;

      break;
    case 'createUser':
      var params = {
        TableName: 'MyblogUsers',
        IndexName: 'emailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': event.arguments.input.email },
        ProjectionExpression: 'id, username, password, email, createdAt',
      }
      
      try{
        var user = await docClient.query(params).promise()
      }catch(e){
        throw new Error(e)
      }

      if (user.Count > 0) {
        throw new Error('Email already exists')
      }

      var date = new Date()

      var id = generateRandomId()

      //event.arguments.password = await bcrypt.hash(event.arguments.password, 10)

      // var token = jwt.sign({ email: event.arguments.email }, jwtSecret, {
      //   expiresIn: '24h',
      // })

      params = {
        TableName: 'MyblogUsers',
        Key: {
          id,
        },
        UpdateExpression:
          'SET createdAt = :createdAt, username = :username, email = :email, password = :password, tokens = :tokens',
        ExpressionAttributeValues: {
          ':createdAt': date.toLocaleString(),
          ':username': event.arguments.input.username,
          ':email': event.arguments.input.email,
          ':password': event.arguments.input.password,
          ':tokens': 1,
        },
        ReturnValues: 'ALL_NEW',
      }

      var result

      try {
        await docClient
          .update(params, (err, data) => {
            if (err) {
              console.log('Unable to add item :', err)
              //check error return code
              return err
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
    case 'deleteUser':
      var params = {
        TableName: 'MyblogUsers',
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
            if (!data['ConsumedCapacity']) {
              console.log(
                'Item deleted succesfully: ',
                JSON.stringify(data, null, 2),
              )
              //reformatting dynamo response element
              result.id = data.Attributes.id.S
            } else {
              console.log('Item does not exist')
            }
          }
        })
        .promise()

      return result
      break;
  }
}