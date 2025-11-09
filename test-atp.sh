#!/bin/bash

# Test the ATP endpoint with a GitHub-related question

echo "Testing ATP with GitHub question..."
echo ""

curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Get all open PRs from company/product repo and filter only the ones with failing checks"
  }' | jq .

echo ""
echo "---"
echo ""
echo "Another test: Count PRs with passing checks"
echo ""

curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Count how many PRs in company/product repo have passing checks"
  }' | jq .
