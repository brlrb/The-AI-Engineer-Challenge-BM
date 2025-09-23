# Merge Instructions for Together AI Integration

This document provides instructions for merging the Together AI integration feature back to the main branch.

## Feature Summary

This feature adds support for Together AI API alongside the existing OpenAI integration. The application can now use either provider based on the user's preference and API key.

### Changes Made

1. **Dependencies**: Added `together==1.1.1` to `pyproject.toml`
2. **Chat Model Classes**: 
   - Created `ChatTogetherAI` class in `aimakerspace/openai_utils/chatmodel.py`
   - Added factory function `create_chat_model()` for provider selection
3. **API Updates**: Modified `api/app.py` to support both providers
4. **Request Model**: Updated `ChatRequest` to accept provider parameter

## Merge Options

### Option 1: GitHub Pull Request (Recommended)

1. **Push the feature branch to GitHub:**
   ```bash
   git push origin feature/together-ai-integration
   ```

2. **Create a Pull Request:**
   - Go to your GitHub repository
   - Click "Compare & pull request" for the `feature/together-ai-integration` branch
   - Set base branch to `main`
   - Add title: "feat: integrate Together AI API support"
   - Add description explaining the changes
   - Assign reviewers if needed
   - Click "Create pull request"

3. **Review and Merge:**
   - Review the changes in the GitHub interface
   - Run any required CI/CD checks
   - Merge the pull request (squash merge recommended)

### Option 2: GitHub CLI

1. **Push the feature branch:**
   ```bash
   git push origin feature/together-ai-integration
   ```

2. **Create PR using GitHub CLI:**
   ```bash
   gh pr create --title "feat: integrate Together AI API support" \
                --body "Add Together AI API support alongside OpenAI integration. Users can now choose between OpenAI and Together AI providers by setting the provider parameter in their chat requests." \
                --base main \
                --head feature/together-ai-integration
   ```

3. **Merge the PR:**
   ```bash
   gh pr merge --squash --delete-branch
   ```

### Option 3: Direct Git Merge (Not Recommended for Production)

If you prefer to merge directly without a PR:

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge the feature branch
git merge feature/together-ai-integration

# Push to main
git push origin main

# Clean up feature branch
git branch -d feature/together-ai-integration
git push origin --delete feature/together-ai-integration
```

## Post-Merge Setup

After merging, users will need to:

1. **Install new dependencies:**
   ```bash
   uv sync  # or pip install -r requirements.txt
   ```

2. **Set up Together AI API key (optional):**
   ```bash
   export TOGETHER_API_KEY=your_together_api_key_here
   ```

3. **Update environment variables** in production deployment

## Usage

Users can now use Together AI by:

1. Setting `provider: "together"` in their chat requests
2. Providing a Together AI API key
3. Optionally specifying a custom model name

Example request:
```json
{
  "user_message": "Hello!",
  "provider": "together",
  "api_key": "your_together_api_key",
  "model": "meta-llama/Llama-3.1-8B-Instruct-Turbo"
}
```

## Testing

The integration has been tested and verified to:
- Import and initialize both OpenAI and Together AI clients
- Support streaming responses for both providers
- Maintain backward compatibility with existing OpenAI usage
- Handle missing API keys gracefully

## Rollback Plan

If issues arise, you can rollback by:
1. Reverting the merge commit
2. Removing the `together` dependency
3. Reverting changes to `chatmodel.py` and `app.py`