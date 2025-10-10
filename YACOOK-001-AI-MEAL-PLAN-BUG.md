# AI Meal Plan Generation Bug Report

**Bug ID:** YACOOK-001  
**Status:** Open  
**Priority:** Medium  
**Component:** AI Service / Meal Plan Generation  
**Reporter:** Main Development Agent  
**Date:** 2024-09-29  

## Summary
AI meal plan generation endpoint (POST /api/ai/generate-meal-plan) returns 500 server error

## Environment
- Backend: FastAPI + Python
- AI Service: Emergent LLM with GPT-4o-mini
- Database: MongoDB
- Environment: Development

## Reproduction Steps
1. Authenticate user via POST /api/auth/login
2. Call POST /api/ai/generate-meal-plan with valid payload:
   ```json
   {
     "days": 7,
     "daily_calories": 2000,
     "dietary_restrictions": []
   }
   ```
3. Observe 500 Internal Server Error response

## Expected Behavior
- Should return 200 OK with generated meal plan
- Response should include meal_plan object with days array
- Each day should contain meals (petit_dejeuner, dejeuner, diner, collation)

## Actual Behavior
- Returns 500 Internal Server Error
- No meal plan generated
- Error prevents dashboard meal plan functionality

## Technical Details

### Request Example
```bash
curl -X POST "https://chef-companion-9.preview.emergentagent.com/api/ai/generate-meal-plan" \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "days": 7,
    "daily_calories": 2000,
    "dietary_restrictions": []
  }'
```

### Response
```
HTTP/1.1 500 Internal Server Error
Content-Type: application/json
```

### Backend Logs
- Check FastAPI logs at `/var/log/supervisor/backend.*.log`
- Look for LLM API errors or budget limit exceptions
- Verify Emergent LLM key configuration

### Environment Configuration
```env
USE_LLM_STUB=true
LLM_DAILY_CAP=low
LLM_MAX_TOKENS=small
EMERGENT_LLM_KEY=sk-emergent-***
```

## Investigation Areas
1. **LLM API Budget**: Check if daily budget exceeded
2. **Token Limits**: Verify LLM_MAX_TOKENS configuration
3. **Service Availability**: Confirm Emergent LLM service status
4. **Request Format**: Validate API request structure
5. **Authentication**: Ensure JWT token is properly validated

## Workarounds Implemented
1. **UI Fallback**: Added friendly French error messages
   - "Plan de repas indisponible pour le moment. Réessayez plus tard."
2. **Error Categorization**: 
   - 500 errors: Service unavailable message
   - 429 errors: Rate limit message
   - Other errors: Connection error message
3. **Detailed Logging**: Enhanced error logging for debugging
4. **Graceful Degradation**: App continues to function without meal plan

## Fix Priority
- **High**: For production deployment
- **Medium**: For development (workaround sufficient)
- Blocking: Phase 1 AI features

## Assignee
- Backend Team / AI Service Integration

## Related Issues
- None identified

## Test Cases
Once fixed, verify:
1. Meal plan generation with different calorie targets
2. Generation with dietary restrictions
3. Generation with different day counts (3, 7, 14 days)
4. Error handling for invalid requests
5. Rate limiting behavior
6. French language meal plan content

---
**Last Updated:** 2024-09-29  
**Next Review:** TBD after backend investigation