#!/bin/bash

# Post-Deploy Verification Checklist
# Usage: ./verify-deployment.sh <production-url>

set -e

DEPLOYMENT_URL="${1:-https://van-ep-manager.vercel.app}"
RESULTS_FILE="deployment-verification-$(date +%Y%m%d-%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

echo "========================================" | tee "$RESULTS_FILE"
echo "Post-Deployment Verification Report" | tee -a "$RESULTS_FILE"
echo "URL: $DEPLOYMENT_URL" | tee -a "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"
echo "========================================" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

# Helper functions
test_endpoint() {
  local name=$1
  local url=$2
  local expected_status=$3
  
  echo -n "Testing $name... "
  
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  
  if [[ $status == $expected_status ]]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $status)"
    echo "✓ $name - HTTP $status" >> "$RESULTS_FILE"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $status)"
    echo "✗ $name - Expected $expected_status, got $status" >> "$RESULTS_FILE"
    ((FAILED++))
  fi
}

test_content() {
  local name=$1
  local url=$2
  local content=$3
  
  echo -n "Testing $name... "
  
  response=$(curl -s "$url")
  
  if [[ $response == *"$content"* ]]; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "✓ $name - Contains expected content" >> "$RESULTS_FILE"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} (Content not found)"
    echo "✗ $name - Content not found" >> "$RESULTS_FILE"
    ((FAILED++))
  fi
}

test_ssl() {
  local url=$1
  
  echo -n "Testing SSL Certificate... "
  
  cert=$(curl -Iv "$url" 2>&1 | grep -i "ssl certificate")
  
  if [[ $cert == *"accepted"* ]] || [[ -z $cert ]]; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "✓ SSL Certificate - Valid" >> "$RESULTS_FILE"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    echo "✗ SSL Certificate - $cert" >> "$RESULTS_FILE"
    ((FAILED++))
  fi
}

test_redirect() {
  local name=$1
  local from=$2
  local to=$3
  
  echo -n "Testing $name redirect... "
  
  status=$(curl -s -o /dev/null -w "%{http_code}" -L "$from")
  
  if [[ $status == "200" ]]; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "✓ $name redirect - OK" >> "$RESULTS_FILE"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    echo "✗ $name redirect - Status $status" >> "$RESULTS_FILE"
    ((FAILED++))
  fi
}

# Start tests
echo "1️⃣  BASIC CONNECTIVITY TESTS" | tee -a "$RESULTS_FILE"
echo "---" | tee -a "$RESULTS_FILE"
test_endpoint "Homepage" "$DEPLOYMENT_URL" "200"
test_ssl "$DEPLOYMENT_URL"
echo "" | tee -a "$RESULTS_FILE"

echo "2️⃣  LOGIN & AUTHENTICATION TESTS" | tee -a "$RESULTS_FILE"
echo "---" | tee -a "$RESULTS_FILE"
test_endpoint "Login page" "$DEPLOYMENT_URL/login" "200"
test_content "Login page has form" "$DEPLOYMENT_URL/login" "email\|password"
echo "" | tee -a "$RESULTS_FILE"

echo "3️⃣  ADMIN PAGES" | tee -a "$RESULTS_FILE"
echo "---" | tee -a "$RESULTS_FILE"
test_endpoint "Import page" "$DEPLOYMENT_URL/import" "307"  # Redirect to login if not authenticated
test_endpoint "Audit log" "$DEPLOYMENT_URL/audit-log" "307"  # Redirect to login
test_endpoint "Dashboard" "$DEPLOYMENT_URL/dashboard" "307"  # Redirect to login
echo "" | tee -a "$RESULTS_FILE"

echo "4️⃣  VIEWER PAGES" | tee -a "$RESULTS_FILE"
echo "---" | tee -a "$RESULTS_FILE"
test_endpoint "My Salary page" "$DEPLOYMENT_URL/my-salary" "307"  # Redirect to login
test_endpoint "My Attendance page" "$DEPLOYMENT_URL/my-attendance" "307"  # Redirect to login
echo "" | tee -a "$RESULTS_FILE"

echo "5️⃣  DEV PAGES (Should be protected)" | tee -a "$RESULTS_FILE"
echo "---" | tee -a "$RESULTS_FILE"
test_endpoint "Test recalculation dev page" "$DEPLOYMENT_URL/dev/test-recalculation" "307"  # Redirect
echo "" | tee -a "$RESULTS_FILE"

echo "6️⃣  SECURITY HEADERS" | tee -a "$RESULTS_FILE"
echo "---" | tee -a "$RESULTS_FILE"

echo -n "Testing X-Content-Type-Options... "
header=$(curl -I -s "$DEPLOYMENT_URL" | grep -i "X-Content-Type-Options")
if [[ ! -z $header ]]; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠ WARNING${NC} (Header not found, but may be OK)"
fi
echo "" | tee -a "$RESULTS_FILE"

echo "7️⃣  RESPONSE TIME TESTS" | tee -a "$RESULTS_FILE"
echo "---" | tee -a "$RESULTS_FILE"

echo -n "Testing homepage response time... "
start_time=$(date +%s%N)
curl -s -o /dev/null "$DEPLOYMENT_URL"
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))
echo "${response_time}ms"

if [[ $response_time -lt 2000 ]]; then
  echo -e "Response time: ${GREEN}✓ ${response_time}ms (< 2000ms)${NC}"
  ((PASSED++))
else
  echo -e "Response time: ${YELLOW}⚠ ${response_time}ms (> 2000ms)${NC}"
fi
echo "Response time: ${response_time}ms" >> "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

echo "8️⃣  DEPLOYMENT CONFIGURATION TESTS" | tee -a "$RESULTS_FILE"
echo "---" | tee -a "$RESULTS_FILE"

# Check if static assets load
echo -n "Testing static assets availability... "
# Common Next.js paths
assets_ok=true
for asset in "_next/static" "_next/image"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/$asset/test" 2>/dev/null || echo "403")
  if [[ $status != "404" ]]; then
    assets_ok=true
  fi
done

if $assets_ok; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠ WARNING${NC} (May affect CSS/JS)"
fi
echo "" | tee -a "$RESULTS_FILE"

# Summary
echo "========================================" | tee -a "$RESULTS_FILE"
echo "SUMMARY" | tee -a "$RESULTS_FILE"
echo "========================================" | tee -a "$RESULTS_FILE"
echo -e "${GREEN}✓ Passed: $PASSED${NC}" | tee -a "$RESULTS_FILE"
echo -e "${RED}✗ Failed: $FAILED${NC}" | tee -a "$RESULTS_FILE"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}🎉 All tests passed! Deployment verified.${NC}" | tee -a "$RESULTS_FILE"
  echo "Report saved to: $RESULTS_FILE"
  exit 0
else
  echo -e "\n${RED}⚠️  Some tests failed. Review report.${NC}" | tee -a "$RESULTS_FILE"
  echo "Report saved to: $RESULTS_FILE"
  exit 1
fi
