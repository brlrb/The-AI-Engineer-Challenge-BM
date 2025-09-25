# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI, AsyncOpenAI
# Import Together AI client
from together import Together
import os
import tempfile
import asyncio
from typing import Optional, Dict, Any
from pathlib import Path

# Import aimakerspace components
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from aimakerspace.vectordatabase import VectorDatabase
from aimakerspace.text_utils import PDFLoader, TextFileLoader, CharacterTextSplitter
from aimakerspace.openai_utils.embedding import EmbeddingModel
from aimakerspace.openai_utils.chatmodel import ChatOpenAI, ChatTogetherAI, create_chat_model
from aimakerspace.image_utils import ImageUploadHandler

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API")

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the API to be accessed from different domains/origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin
    allow_credentials=True,  # Allows cookies to be included in requests
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers in requests
)

# Global variables for RAG system
vector_db: Optional[VectorDatabase] = None
current_document_name: Optional[str] = None
embedding_model: Optional[EmbeddingModel] = None
current_image: Optional[dict] = None

# Define the data model for chat requests using Pydantic
# This ensures incoming request data is properly validated
class ChatRequest(BaseModel):
    user_message: str      # Message from the user
    model: Optional[str] = None  # Optional model selection with default
    api_key: str          # API key for authentication (OpenAI or Together AI)
    provider: Optional[str] = "openai"  # AI provider (openai, together)
    style: Optional[Dict[str, int]] = None  # Style parameters
    has_context: Optional[bool] = False  # Whether document context is available

# Unified file upload endpoint for PDF, TXT, and image files
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), api_key: str = Form(...)):
    global vector_db, current_document_name, embedding_model, current_image
    
    try:
        # Validate file type
        allowed_types = ["application/pdf", "text/plain", "image/jpeg", "image/jpg"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Only PDF, TXT, and JPG/JPEG files are allowed")
        
        # Validate file size (50MB limit)
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:  # 50MB
            raise HTTPException(status_code=400, detail="File size must be less than 50MB")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Handle image files
            if file.content_type in ["image/jpeg", "image/jpg"]:
                # Process the image using aimakerspace
                image_handler = ImageUploadHandler()
                result = image_handler.handle_upload(content, file.filename)
                
                if not result['success']:
                    raise HTTPException(status_code=400, detail=result['error'])
                
                # Store the processed image
                current_image = {
                    'filename': result['filename'],
                    'image_base64': result['image_base64'],
                    'image_info': result['image_info']
                }
                
                # Clear document context when uploading image
                vector_db = None
                current_document_name = None
                
                return {
                    "message": "Image uploaded and processed successfully",
                    "filename": result['filename'],
                    "image_info": result['image_info'],
                    "file_type": "image"
                }
            
            # Handle document files (PDF/TXT)
            else:
                # Initialize embedding model with API key
                os.environ["OPENAI_API_KEY"] = api_key
                embedding_model = EmbeddingModel()
                
                # Update the clients with the API key
                embedding_model.async_client = AsyncOpenAI(api_key=api_key)
                embedding_model.client = OpenAI(api_key=api_key)
                
                # Process the file based on type
                if file.content_type == "application/pdf":
                    pdf_loader = PDFLoader(temp_file_path)
                    pdf_loader.load_file()
                    documents = pdf_loader.documents
                else:  # text/plain
                    text_loader = TextFileLoader(temp_file_path)
                    text_loader.load_file()
                    documents = text_loader.documents
                
                # Split documents into chunks
                splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
                chunks = splitter.split_texts(documents)
                
                # Create vector database and populate it
                vector_db = VectorDatabase(embedding_model)
                await vector_db.abuild_from_list(chunks)
                
                # Store document name
                current_document_name = file.filename
                
                # Clear image context when uploading document
                current_image = None
                
                return {
                    "message": "File uploaded and processed successfully",
                    "filename": file.filename,
                    "chunks_created": len(chunks),
                    "document_type": file.content_type,
                    "file_type": "document"
                }
            
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(request: ChatRequest):
    global vector_db, current_document_name, current_image
    
    try:
        # Set the appropriate API key based on provider
        if request.provider.lower() == "together":
            os.environ["TOGETHER_API_KEY"] = request.api_key
            # Initialize Together AI client
            client = Together(api_key=request.api_key)
        else:
            os.environ["OPENAI_API_KEY"] = request.api_key
            # Initialize OpenAI client
            client = OpenAI(api_key=request.api_key)
        
        # Create an async generator function for streaming responses
        async def generate():
            # Prepare system message
            system_content = "You are a helpful AI assistant."
            
            # Prepare messages list
            messages = [{"role": "system", "content": system_content}]
            
            # If we have document context, use RAG
            if request.has_context and vector_db is not None and current_document_name:
                # Search for relevant chunks
                relevant_chunks = vector_db.search_by_text(request.user_message, k=5, return_as_text=True)
                
                # Create context from relevant chunks
                context = "\n\n".join(relevant_chunks)
                
                system_content = f"""You are a helpful AI assistant that answers questions based on the uploaded document "{current_document_name}". 
                
                IMPORTANT: You should ONLY answer questions based on the content provided in the document context below. If the question cannot be answered from the document context, politely explain that you can only answer questions about the uploaded document.

                Document Context:
                {context}
                
                Please answer the user's question based only on the information provided in the document context above."""
                
                messages[0]["content"] = system_content
            elif request.has_context and current_image is not None:
                # Handle image context
                system_content = f"""You are a helpful AI assistant that can analyze and answer questions about images. 
                
                IMPORTANT: You should ONLY answer questions based on the Image. If the question cannot be answered from the image context, politely explain that you can only answer questions about the uploaded image.

                The user has uploaded an image and wants you to analyze it. Please provide detailed and helpful responses about what you see in the image."""
                
                messages[0]["content"] = system_content
            
            # Handle image if present
            if current_image is not None:
                # Add image to the user message
                user_content = [
                    {
                        "type": "text",
                        "text": request.user_message
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{current_image['image_base64']}"
                        }
                    }
                ]
            else:
                user_content = request.user_message
            
            # Add user message to messages
            messages.append({"role": "user", "content": user_content})
            
            # Determine the model to use based on provider
            if request.model is None:
                if request.provider.lower() == "together":
                    model = "meta-llama/Llama-3.1-8B-Instruct-Turbo"
                else:
                    model = "gpt-4o-mini"
            else:
                model = request.model
            
            # Create a streaming chat completion request
            stream = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True  # Enable streaming response
            )
            
            # Yield each chunk of the response as it becomes available
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        # Handle any errors that occur during processing
        raise HTTPException(status_code=500, detail=str(e))

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Vercel requires a handler function
# handler = app
