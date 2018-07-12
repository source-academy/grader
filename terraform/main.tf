provider "aws" {
  region = "ap-southeast-1"
}

resource  "aws_iam_role" "iam_for_lambda" {
  name = "iam_for_lambda"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_lambda_function" "test_lambda" {
  filename      = "grader.zip"
  function_name = "grader"
  handler       = "index.myHandler"
  role          = "${aws_iam_role.iam_for_lambda.arn}"
  runtime       = "nodejs8.10"
  source_code_hash = "${base64sha256(file("grader.zip"))}"
}
