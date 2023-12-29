# NodeAuthBase-JS

NodeAuthBase-JS is an authentication library for Node.js that simplifies the implementation of authentication-related functionalities in your Express applications. It provides tools for managing Sequelize models, creating Express routes, initializing email configurations, and setting up Swagger documentation.

## Installation

```bash
npx NodeAuthBase-JS <project-name>
```
## Manual Installation
Clone the repo: 
```bash
git clone --depth 1 https://github.com/hiral-makwana/NodeAuthBase-JS.git
cd <project-name>
npx rimraf ./.git
```
## Environment variables
File path: ./config/config.json: 
```bash
   "PORT": 8000,

   #JWT comfiguration details
   "JWT_SECRET": jwtSecretkey,
   "JWT_EXPIRATION_TIME": Expiration time of jwt. Example - 1h,

   # APIs default route which is used in swagger
   "DEFAULT_ROUTE": "/",

   #APIs prefix route to access swagger
   "API_BASE_PREFIX": "/"

   #Base url of server to access static files
   "BASE_URL": "localhost:7000",

   #To manage delete APIs functionality. Hard delete or soft delete
   "HARD_DELETE": false,

   #To add/ manage custome templete for email Templetes in request data
   "CUSTOM_TEMPLATE": true,

   #To define static path of directory to uploads profile pictures or any media
   "UPLOAD_DIR": "src/pictures/",

   #Database configuration - MySQL, Sequelize
   "DATABASE": {
      "host": "localhost",
      "dbName": "database_name",
      "dbUser": "root",
      "dbPassword": ""
   },

   #To manage send mail using SMTP or sendmail()
   "SMTP": true,

   # SMTP configuration options for the email service
   # For testing, you can use a fake SMTP service like Ethereal: https://ethereal.email/create
   "SMTP_CONFIG": {
      "host": "email-server",
      "port": 587,
      "user": "email-server-username",
      "password": "email-server-password"
   }
```
## Usage

### 1. Start the server

```
npm start
```

### 2. Expected result 
#### 1. local server
![result_1](https://raw.githubusercontent.com/hiral-makwana/Auth-boilerplate-js/auth-1.0/src/blob/result_1.png)
#### 2. Swagger APIs
![result_2](https://raw.githubusercontent.com/hiral-makwana/Auth-boilerplate-js/auth-1.0/src/blob/result_2.png)

## Project Structure

```
.
├── src                               
│   ├── server.ts
│   ├── bin                        
│   ├── config
│   ├── controllers
│   ├── docs                     
│   ├── email_templates
│   ├── helper
│   ├── locales
│   ├── middeleware
│   ├── models
│   ├── routers                   
│   ├── types             
│   ├── uploads                      
│   ├── validator                        
│   └── routes
├── test                      
├── package.json
├── tsconfig.json
└── README.md
```

## API Documentation

To view the list of available APIs and their specifications, run the server and go to `http://localhost:7000/api-docs` in your browser. This documentation page is automatically generated using the [swagger](https://swagger.io/) definitions written as comments in the route files.

### API Endpoints

List of available routes:

**Auth routes**:\
`POST /register` - register\
`POST /verifyOtp` - verifyOtp\
`POST /resendOtp` - resend Otp\
`POST /forgotPassword` - send Otp mail\
`POST /resetPassword` - reset user password

**User routes**:\
`POST /login` - login user\
`GET /list` - get all users\
`POST /changePassword` - change password after login\
`POST /checkValidation` - check value in Database is available or not\
`DELETE /deleteUser/{userId}` - delete user\
`POST /upload/{userId}` - upload avatar for user profile

**HTML routes**:\
`POST /htmlToString` - convert HTML to string\

## Validation

Request data is validated using [celebrate](https://www.npmjs.com/package/celebrate). Check the [documentation](https://joi.dev/api/) for more details on how to write Celebrate-Joi validation schemas.

The validation schemas are defined in the `src/validator` directory and are used in the routes by providing them as parameters to the `validate` middleware.

```javascript
const { Router } = require('express');
const userController = require('../controller/user.controller');
const userValidator = require('../validator/user.validator');

const router = Router();

router.post('/register', userValidator.registerUser(), userController.registerUser);
```

## Authentication

To require authentication for certain routes, you can use the `verifyToken` middleware.

```javascript
const { Router } = require('express');
const userController = require('../controller/user.controller');
const userValidator = require('../validator/user.validator');
const { verifyToken } = require('../middleware/auth');

const router = Router();

router.get('/list', verifyToken, userController.getListOfUser);
```

These routes require a valid JWT access token in the Authorization request header using the Bearer schema. If the request does not contain a valid access token, an Unauthorized (401) error is thrown.

**Generating Access Tokens**:

An access token can be generated by making a successful call to the register (`POST /register`) and login (`POST /login`) endpoints.

## Custom Email Template
To add custom email Template for `/register` and `/forgotPassword` APIs need to define in request body data. We can not send HTML data direct to request using JSON so need to convert it in to the string using `/htmlToString` API.

```json
{
    "firstName": "John",
    "email": "john.doe@example.com",
    "password": "Password@123",
    "customOtpHtmlTemplate": "<html lang=\"en\"> <head> <meta charset=\"UTF-8\"> <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"> <title>OTP Email</title> <style> body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; } .container { max-width: 600px; margin: 20px auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); } h2 { text-align: center; color: #333; } p { color: #555; } .otp-container { text-align: center; padding: 20px; background-color: #f9f9f9; border-radius: 4px; } .footer { margin-top: 20px; text-align: center; color: #888; } </style>\r</head> <body> <div class=\"container\"> <h2>OTP Email</h2> <p>Dear {{username}},</p> <p>Your One-Time Password (OTP) is:</p> <div class=\"otp-container\"> <h3 style=\"color: #4caf50; font-size: 36px;\">{{otpCode}}</h3> </div> <p>Please use this OTP to complete your action.</p> <div class=\"footer\"> <p>Thank you for using our service.</p> <p>Copyright © 2023 Your Company</p> </div> </div> </body> </html>"
}
```
## Custom Validation message
To add custom validation message for any field add `messages` property into request data. For details of validations key check below [Additional Details](#additional-details) section.

```json
{
    "messages": {
        "email": {
            "any.required": "email is required"
        }
    },
    "firstName": "Test",
    "emails": 211,
    "password": "String@123"
}
```
## Additional Details
#### Types of validations (Use to add custom error message for validation in APIs)
| Type     | Description                       |
| :------- | :-------------------------------- |
| string.base         | Specifies that the value must be a string.           |
| number.base         | Specifies that the value must be a number.           |
| boolean.base        | Specifies that the value must be a boolean.          |
| object.base         | Specifies that the value must be an object.          |
| array.base          | Specifies that the value must be an array.           |
| date.base           | Specifies that the value must be a date.            |
| alternatives   | Specifies multiple valid alternatives for the value. |
| any.required   | Specifies that the property is required.             |
| any.optional   | Specifies that the property is optional.             |
| any.forbidden  | Specifies that the property is forbidden.            |
| any.allow      | Specifies the allowed values for the property.       |
| any.valid      | Specifies the valid values for the property.         |
| any.invalid    | Specifies the invalid values for the property.       |
| any.default    | Specifies the default value for the property.        |
| string.email   | Specifies that the string must be a valid email.     |
| string.min     | Specifies the minimum length of the string.          |
| string.max     | Specifies the maximum length of the string.          |
| number.min     | Specifies the minimum value for the number.          |
| number.max     | Specifies the maximum value for the number.          |
| date.min       | Specifies the minimum date for the date.             |
| date.max       | Specifies the maximum date for the date.             |
| string.pattern | Specifies a regular expression pattern for the string.|
| any.when       | Specifies conditional validation based on another property.|
| any.error      | Specifies custom error messages for the property.    |
| any.label      | Specifies a custom label for the property in error messages.|
| any.messages   | Specifies custom validation error messages.         |
