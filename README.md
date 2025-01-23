
# Template Parser

A Lambda function that generates dynamic HTML templates using Handlebars, fetching them from an S3 bucket.

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ajishvnair/template-parser.git
   cd template-parser
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file with:
   ```
   AWS_REGION=your-region
   BUCKET_NAME=your-bucket-name
   MAX_TEMPLATE_SIZE=100000
   S3_TIMEOUT=10000
   ```
4. **Test in local**:
   ```bash
   npm run dev
   ```

5. **To Run Test**:
   ```bash
   npm run test
   ```

## Deployment

1. **Build the function**:
   ```bash
   npm run build
   ```

2. **Deploy the Lambda function** via AWS Lambda Console or AWS CLI.

3. **Create an API Gateway** to expose the Lambda function.

## Usage

Make a POST request to the API Gateway URL:

```bash
curl -X POST <your-function-url> -H "Content-Type: application/json" -d '{
    "templateKey": "templates/sample.hbs",
    "variables": { "title": "Welcome", "user": { "name": "John", "role": "Admin" } }
}'
```

## License

MIT License
